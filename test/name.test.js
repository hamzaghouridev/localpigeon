import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADJECTIVES, ANIMALS, generateName } from '../lib/name.js';

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
  for (const adj of ADJECTIVES) for (const animal of ANIMALS) existing.add(`${adj} ${animal}`);
  const next = generateName(existing);
  assert.match(next, / #\d+$/, `expected numeric suffix, got ${next}`);
});
