import { randomUUID } from 'node:crypto';
import { generateName } from './name.js';

export class PeerRegistry {
  constructor() {
    this.byId = new Map();
    this.bySocket = new WeakMap();
  }

  add(ws) {
    const peerId = randomUUID();
    const names = new Set([...this.byId.values()].map(p => p.name));
    const name = generateName(names);
    const peer = { peerId, name, ws };
    this.byId.set(peerId, peer);
    this.bySocket.set(ws, peer);
    return peer;
  }

  remove(ws) {
    const peer = this.bySocket.get(ws);
    if (!peer) return null;
    this.byId.delete(peer.peerId);
    this.bySocket.delete(ws);
    return peer;
  }

  get(peerId) {
    return this.byId.get(peerId);
  }

  getBySocket(ws) {
    return this.bySocket.get(ws);
  }

  list() {
    return [...this.byId.values()].map(({ peerId, name }) => ({ peerId, name }));
  }
}
