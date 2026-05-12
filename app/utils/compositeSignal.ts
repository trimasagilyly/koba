import { ema } from "./ema";
import { rsi } from "./rsi";
import { computeStreak } from "./computeStreak";

export function compositeSignal(history: number[]): number {
  if (history.length < 6) {
    const tail = history.length;
    return tail >= 2
      ? (history[tail - 1] - history[tail - 2]) / history[tail - 2]
      : 0;
  }

  const last = history[history.length - 1];
  const fastPeriod = Math.min(8, Math.floor(history.length / 3));
  const slowPeriod = Math.min(21, Math.floor(history.length * 0.6));
  const fastEma = ema(history, fastPeriod);
  const slowEma = ema(history, slowPeriod);
  const emaCross = slowEma > 0 ? (fastEma - slowEma) / slowEma : 0;

  const ret5 =
    history.length >= 6
      ? (last - history[history.length - 6]) / history[history.length - 6]
      : 0;
  const ret10 =
    history.length >= 11
      ? (last - history[history.length - 11]) / history[history.length - 11]
      : ret5;
  const ret20 =
    history.length >= 21
      ? (last - history[history.length - 21]) / history[history.length - 21]
      : ret10;

  // Giới hạn streak ở ±5: xu hướng kéo dài 60 tick không được khuếch đại hơn xu hướng 5 tick
  const streak = Math.max(-5, Math.min(5, computeStreak(history))) / 10;
  const rsiVal = rsi(history, Math.min(14, Math.floor(history.length / 2)));
  // RSI dùng như xác nhận xu hướng (trend-following), đúng với bản chất momentum trader
  const rsiSignal = (rsiVal - 50) / 100;

  return Math.max(
    -1,
    Math.min(
      1,
      emaCross * 0.3 +
        ret5 * 0.25 +
        ret10 * 0.15 +
        ret20 * 0.1 +
        streak * 0.12 +
        rsiSignal * 0.08,
    ),
  );
}
