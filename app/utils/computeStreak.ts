export function computeStreak(history: number[]): number {
  if (history.length < 2) return 0;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const dir = last > prev ? 1 : last < prev ? -1 : 0;
  if (dir === 0) return 0;
  let streak = dir;
  for (let i = history.length - 2; i > 0; i--) {
    const d =
      history[i] > history[i - 1] ? 1 : history[i] < history[i - 1] ? -1 : 0;
    if (d !== dir) break;
    streak += dir;
  }
  return streak;
}
