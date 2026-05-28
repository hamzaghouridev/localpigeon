const ADJECTIVES = [
  'Calm', 'Quiet', 'Bright', 'Swift', 'Bold', 'Brave', 'Clever', 'Kind',
  'Wild', 'Sunny', 'Lucky', 'Happy', 'Eager', 'Gentle', 'Jolly', 'Merry',
  'Witty', 'Proud', 'Sharp', 'Snug'
];

const ANIMALS = [
  'Falcon', 'Tiger', 'Otter', 'Bear', 'Fox', 'Wolf', 'Hawk', 'Lynx',
  'Panda', 'Koala', 'Heron', 'Badger', 'Beaver', 'Robin', 'Squirrel', 'Moose',
  'Raven', 'Stoat', 'Mole', 'Mink'
];

const MAX_RETRIES = 5;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateName(existingNames) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const candidate = `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
    if (!existingNames.has(candidate)) return candidate;
  }
  const base = `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
  let n = 2;
  while (existingNames.has(`${base} #${n}`)) n++;
  return `${base} #${n}`;
}
