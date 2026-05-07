export function ema(history: number[], period: number): number {
  if (history.length === 0) return 0;
  const slice = history.slice(-period * 2);
  const k = 2 / (period + 1);
  let e = slice[0];
  for (let i = 1; i < slice.length; i++) e = slice[i] * k + e * (1 - k);
  return e;
}
