import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateName } from '../lib/name.js';

test('returns a two-word name', () => {
  const name = generateName(new Set());
  const parts = name.split(' ');
  assert.equal(parts.length, 2);
  assert.ok(parts[0].length > 0);
  assert.ok(parts[1].length > 0);
});

test('avoids names already in the set', () => {
  const existing = new Set();
  for (let i = 0; i < 20; i++) existing.add(generateName(existing).split(' #')[0]);
  const next = generateName(existing);
  if (!next.includes(' #')) {
    assert.ok(!existing.has(next));
  }
});

test('falls back to numeric suffix when adjective+animal space is exhausted', () => {
  const existing = new Set();
  for (let i = 0; i < 1000; i++) existing.add(`Calm Falcon`);
  const colliding = new Set(['Calm Falcon']);
  for (let i = 0; i < 200; i++) {
    const n = generateName(colliding);
    colliding.add(n);
  }
  const suffixed = [...colliding].filter(n => / #\d+$/.test(n));
  assert.ok(suffixed.length > 0, 'expected at least one suffixed name');
});
