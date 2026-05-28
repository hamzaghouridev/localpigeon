import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { PeerRegistry } from './lib/registry.js';
import { parseBinaryHeader } from './lib/protocol.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function serveStatic(req, res) {
  const url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, url);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await fs.readFile(filePath);
    const type = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

export function createHttpServer() {
  return http.createServer((req, res) => {
    serveStatic(req, res);
  });
}

const MAX_CONTROL_BYTES = 4096;

function sendJson(ws, msg) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcastPeerList(registry, wss) {
  const peers = registry.list();
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      sendJson(client, { type: 'peer-list', peers });
    }
  }
}

const ROUTABLE_TYPES = new Set([
  'offer', 'accept', 'reject', 'cancel', 'transfer-complete'
]);

export function createWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const registry = new PeerRegistry();
  const transfers = new Map();
  const pendingOffers = new Map();

  wss.on('connection', (ws) => {
    const peer = registry.add(ws);
    sendJson(ws, {
      type: 'hello',
      peerId: peer.peerId,
      name: peer.name,
      peers: registry.list().filter(p => p.peerId !== peer.peerId)
    });
    broadcastPeerList(registry, wss);

    ws.on('close', () => {
      for (const [transferId, entry] of transfers) {
        if (entry.senderWs === ws) {
          sendJson(entry.receiverWs, { type: 'cancel', transferId, reason: 'sender-disconnected' });
          transfers.delete(transferId);
        } else if (entry.receiverWs === ws) {
          sendJson(entry.senderWs, { type: 'cancel', transferId, reason: 'receiver-disconnected' });
          transfers.delete(transferId);
        }
      }
      for (const [transferId, entry] of pendingOffers) {
        if (entry.senderWs === ws) {
          pendingOffers.delete(transferId);
        } else if (entry.receiverWs === ws) {
          sendJson(entry.senderWs, { type: 'cancel', transferId, reason: 'receiver-disconnected' });
          pendingOffers.delete(transferId);
        }
      }
      registry.remove(ws);
      broadcastPeerList(registry, wss);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        let parsed;
        try { parsed = parseBinaryHeader(data); }
        catch { return; }
        const entry = transfers.get(parsed.transferId);
        if (!entry || entry.senderWs !== ws) return;
        if (entry.receiverWs.readyState === entry.receiverWs.OPEN) {
          entry.receiverWs.send(data, { binary: true });
        }
        return;
      }
      if (data.length > MAX_CONTROL_BYTES) { ws.close(); return; }

      let msg;
      try { msg = JSON.parse(data.toString()); }
      catch { return; }

      if (!msg || typeof msg.type !== 'string') return;
      if (!ROUTABLE_TYPES.has(msg.type)) return;

      const sender = registry.getBySocket(ws);
      if (!sender) return;

      if (msg.type === 'offer') {
        const dest = registry.get(msg.toPeerId);
        if (!dest) {
          sendJson(ws, { type: 'cancel', transferId: msg.transferId, reason: 'peer-not-found' });
          return;
        }
        pendingOffers.set(msg.transferId, { senderWs: ws, receiverWs: dest.ws });
        sendJson(dest.ws, {
          type: 'offer',
          transferId: msg.transferId,
          fromPeerId: sender.peerId,
          fromName: sender.name,
          filename: String(msg.filename || 'file'),
          size: Number(msg.size) || 0,
          mime: String(msg.mime || 'application/octet-stream')
        });
        return;
      }

      if (msg.type === 'accept') {
        const entry = pendingOffers.get(msg.transferId);
        if (!entry) return;
        if (entry.receiverWs !== ws) return;
        pendingOffers.delete(msg.transferId);
        transfers.set(msg.transferId, { senderWs: entry.senderWs, receiverWs: ws });
        sendJson(entry.senderWs, { type: 'accept', transferId: msg.transferId });
        return;
      }

      if (msg.type === 'reject') {
        const entry = pendingOffers.get(msg.transferId);
        if (!entry) return;
        if (entry.receiverWs !== ws) return;
        pendingOffers.delete(msg.transferId);
        sendJson(entry.senderWs, { type: 'reject', transferId: msg.transferId });
        return;
      }

      if (msg.type === 'cancel') {
        const entry = transfers.get(msg.transferId) || pendingOffers.get(msg.transferId);
        if (!entry) return;
        transfers.delete(msg.transferId);
        pendingOffers.delete(msg.transferId);
        const other = entry.senderWs === ws ? entry.receiverWs : entry.senderWs;
        if (other) sendJson(other, { type: 'cancel', transferId: msg.transferId, reason: msg.reason || 'cancelled' });
        return;
      }

      if (msg.type === 'transfer-complete') {
        const entry = transfers.get(msg.transferId);
        if (!entry) return;
        if (entry.senderWs !== ws) return;
        transfers.delete(msg.transferId);
        sendJson(entry.receiverWs, { type: 'transfer-complete', transferId: msg.transferId });
        return;
      }
    });
  });

  return { wss, registry };
}

function lanAddress() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createHttpServer();
  createWsServer(server);
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, '0.0.0.0', () => {
    const lan = lanAddress();
    console.log('');
    console.log('  LAN File Share is running');
    console.log('');
    console.log(`  On this device:   http://localhost:${port}`);
    if (lan) console.log(`  Other devices:    http://${lan}:${port}`);
    console.log('');
  });
}
