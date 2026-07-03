// lib/utils.js

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export function padWithByes(players, targetSize) {
  const result = [...players];
  while (result.length < targetSize) {
    result.push({ id: `bye_${result.length}`, name: 'BYE', seed: null, isBye: true });
  }
  return result;
}

// Standard bracket seeding: ensures seed 1 & 2 meet only in finals,
// seeds 3 & 4 in the semifinals, etc. Mirror value doubles per level.
export function getSeededSlots(size) {
  let slots = [1];
  while (slots.length < size) {
    const mirror = slots.length * 2 + 1;
    const next = [];
    for (const s of slots) {
      next.push(s);
      next.push(mirror - s);
    }
    slots = next;
  }
  return slots;
}

export function arrangePlayers(players, size) {
  const seededSlots = getSeededSlots(size);
  const slotArray = new Array(size).fill(null);
  const seeded = [...players].filter(p => p.seed != null).sort((a, b) => a.seed - b.seed);
  const unseeded = shuffle(players.filter(p => p.seed == null));

  seeded.forEach(player => {
    const slotIndex = seededSlots.indexOf(player.seed);
    if (slotIndex !== -1 && !slotArray[slotIndex]) slotArray[slotIndex] = player;
    else unseeded.unshift(player); // seed out of range → treat as unseeded
  });

  // Fill remaining slots strongest-position-first so BYEs land on the
  // weakest seed positions and always face a real player (never BYE vs BYE).
  const emptyIdx = [];
  for (let i = 0; i < size; i++) if (!slotArray[i]) emptyIdx.push(i);
  emptyIdx.sort((a, b) => seededSlots[a] - seededSlots[b]);
  let ui = 0;
  emptyIdx.forEach(i => {
    slotArray[i] = ui < unseeded.length
      ? unseeded[ui++]
      : { id: `bye_${i}`, name: 'BYE', seed: null, isBye: true };
  });
  return slotArray;
}

// Snake-draft distribution into groups
export function distributeToGroups(players, numGroups) {
  const sorted = [...players].sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed;
    if (a.seed != null) return -1;
    if (b.seed != null) return 1;
    return 0;
  });
  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: i,
    name: String.fromCharCode(65 + i),
    players: []
  }));
  sorted.forEach((p, idx) => {
    const row = Math.floor(idx / numGroups);
    const col = row % 2 === 0 ? idx % numGroups : numGroups - 1 - (idx % numGroups);
    groups[col].players.push(p);
  });
  return groups;
}

export function createPlayer(id, name, seed = null) {
  return { id: `player_${id}`, name: name.trim() || `選手 ${id + 1}`, seed, isBye: false };
}

export function parseScore(val) {
  const n = parseInt(val, 10);
  return isNaN(n) || n < 0 ? null : n;
}

export function defaultSwissRounds(n) {
  return Math.ceil(Math.log2(Math.max(n, 2)));
}

export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
