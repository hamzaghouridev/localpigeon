import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PeerRegistry } from '../lib/registry.js';

const fakeSocket = () => ({ id: Math.random() });

test('add returns a peer with id, name, and socket', () => {
  const r = new PeerRegistry();
  const ws = fakeSocket();
  const peer = r.add(ws);
  assert.ok(peer.peerId);
  assert.ok(peer.name);
  assert.equal(peer.ws, ws);
});

test('list returns all peers as plain objects without sockets', () => {
  const r = new PeerRegistry();
  r.add(fakeSocket());
  r.add(fakeSocket());
  const list = r.list();
  assert.equal(list.length, 2);
  for (const p of list) {
    assert.ok(p.peerId);
    assert.ok(p.name);
    assert.equal(p.ws, undefined);
  }
});

test('remove drops the peer by socket', () => {
  const r = new PeerRegistry();
  const ws = fakeSocket();
  const { peerId } = r.add(ws);
  r.remove(ws);
  assert.equal(r.get(peerId), undefined);
});

test('get returns the full peer record', () => {
  const r = new PeerRegistry();
  const ws = fakeSocket();
  const { peerId } = r.add(ws);
  const got = r.get(peerId);
  assert.equal(got.ws, ws);
});

test('names are unique within the registry', () => {
  const r = new PeerRegistry();
  const names = new Set();
  for (let i = 0; i < 20; i++) {
    const { name } = r.add(fakeSocket());
    assert.ok(!names.has(name), `duplicate name: ${name}`);
    names.add(name);
  }
});
