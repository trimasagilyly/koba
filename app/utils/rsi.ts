export function rsi(history: number[], period: number = 14): number {
  if (history.length < period + 1) return 50;
  const slice = history.slice(-(period + 1));
  let gains = 0,
    losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}
