/** Defence (or protection) that halves what gets through. */
export const MITIGATION_K = 100;

/** The share removed by `defence`: 0 → 0, K → ½, never 1. */
export const mitigation = (defence: number) => {
  const d = Math.max(0, defence);
  return d / (d + MITIGATION_K);
};
