import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import WebSocket from 'ws';
import { createHttpServer, createWsServer } from '../server.js';
import { buildBinaryHeader, HEADER_SIZE } from '../lib/protocol.js';

async function startServer() {
  const http = createHttpServer();
  createWsServer(http);
  await new Promise(r => http.listen(0, '127.0.0.1', r));
  const { port } = http.address();
  return { http, url: `ws://127.0.0.1:${port}` };
}

function nextMessage(ws, predicate) {
  return new Promise((resolve) => {
    function onMsg(data, isBinary) {
      if (isBinary) {
        if (predicate({ binary: data })) { ws.off('message', onMsg); resolve(data); }
        return;
      }
      const msg = JSON.parse(data.toString());
      if (predicate(msg)) { ws.off('message', onMsg); resolve(msg); }
    }
    ws.on('message', onMsg);
  });
}

test('end-to-end transfer of 1 MB between two peers', async () => {
  const { http, url } = await startServer();
  try {
    const a = new WebSocket(url);
    const b = new WebSocket(url);

    const helloA = await nextMessage(a, m => m.type === 'hello');
    const helloB = await nextMessage(b, m => m.type === 'hello');

    const transferId = randomUUID();
    const payload = randomBytes(1024 * 1024);

    a.send(JSON.stringify({
      type: 'offer',
      transferId,
      toPeerId: helloB.peerId,
      filename: 'blob.bin',
      size: payload.length,
      mime: 'application/octet-stream'
    }));

    const offer = await nextMessage(b, m => m.type === 'offer');
    assert.equal(offer.transferId, transferId);
    assert.equal(offer.fromPeerId, helloA.peerId);

    b.send(JSON.stringify({ type: 'accept', transferId }));
    await nextMessage(a, m => m.type === 'accept' && m.transferId === transferId);

    const header = buildBinaryHeader(transferId);
    const CHUNK = 64 * 1024;
    const received = [];
    let bytesReceived = 0;
    const done = new Promise((resolve) => {
      b.on('message', (data, isBinary) => {
        if (isBinary) {
          received.push(data.subarray(HEADER_SIZE));
          bytesReceived += data.length - HEADER_SIZE;
          return;
        }
        const m = JSON.parse(data.toString());
        if (m.type === 'transfer-complete') resolve();
      });
    });

    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.subarray(i, i + CHUNK);
      a.send(Buffer.concat([header, slice]), { binary: true });
    }
    a.send(JSON.stringify({ type: 'transfer-complete', transferId }));

    await done;
    const reassembled = Buffer.concat(received);
    assert.equal(reassembled.length, payload.length);
    assert.deepEqual(reassembled, payload);

    a.close(); b.close();
  } finally {
    await new Promise(r => http.close(r));
  }
});
