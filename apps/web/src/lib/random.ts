const cyrb128 = (str: string) => {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  (h1 ^= h2 ^ h3 ^ h4), (h2 ^= h1), (h3 ^= h1), (h4 ^= h1);
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
};

export const sfc32 = (a: number, b: number, c: number, d: number) => {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
};

export const seededRandom = (seed: string) => {
  const key = cyrb128(seed);

  return sfc32(key[0], key[1], key[2], key[3]);
};

export const selectRandom = <T extends { rarity: number }>(
  seed: string,
  items: T[]
): T | null => {
  if (items.length === 0) return null;

  const randomNumber = seededRandom(seed)();

  // Sort items by rarity in descending order
  const sortedItems = [...items].sort((a, b) => b.rarity - a.rarity);

  // Calculate total rarity
  const totalRarity = sortedItems.reduce((sum, item) => sum + item.rarity, 0);

  // Normalize the random value to the total rarity range
  const normalizedRandom = randomNumber * totalRarity;

  let currentSum = 0;
  for (const item of sortedItems) {
    currentSum += item.rarity;
    if (normalizedRandom <= currentSum) {
      return item;
    }
  }

  // Fallback to the last item if no selection was made
  return sortedItems[sortedItems.length - 1];
};

export const randomIndex = <T>(arr: T[]): number | null => {
  if (arr.length === 0) {
    return null;
  }
  return Math.floor(Math.random() * arr.length);
};

export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
