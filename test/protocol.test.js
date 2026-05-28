import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildBinaryHeader, parseBinaryHeader, HEADER_SIZE } from '../lib/protocol.js';

test('header size is 16 bytes', () => {
  assert.equal(HEADER_SIZE, 16);
});

test('round-trips a transfer ID through build/parse', () => {
  const id = randomUUID();
  const header = buildBinaryHeader(id);
  assert.equal(header.byteLength, HEADER_SIZE);

  const payload = Buffer.from('hello world');
  const frame = Buffer.concat([header, payload]);
  const { transferId, payload: extracted } = parseBinaryHeader(frame);

  assert.equal(transferId, id);
  assert.deepEqual(extracted, payload);
});

test('throws on too-short input', () => {
  assert.throws(() => parseBinaryHeader(Buffer.alloc(8)), /too short/i);
});
