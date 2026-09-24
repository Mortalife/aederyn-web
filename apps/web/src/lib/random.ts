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
