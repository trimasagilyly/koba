import type { StockInfo } from "../types";

/**
 * Enriched fair value dùng relative valuation với benchmark thị trường.
 *
 * Lý do sửa:
 * - Không dùng EPS * chính P/E của cổ phiếu để suy ra fair value,
 *   vì phép đó gần như quay lại market price hiện tại.
 * - Không để book value kéo fair value xuống quá sâu, vì P/B > 1 là rất phổ biến.
 * - Fair value chỉ nên lệch vừa phải quanh initial price để fundamentalists đóng vai trò
 *   neo giá, không biến thành lực bán/mua cực đoan ngay từ đầu.
 *
 * Cơ sở:
 * - P/E và P/B nên được dùng theo relative valuation: so với benchmark thị trường,
 *   ngành, peer group hoặc trung bình lịch sử.
 * - Vì mô hình không có forecast đầy đủ, fair value được neo quanh initialPrice
 *   và chỉ điều chỉnh nhẹ theo valuation signal.
 */

const MARKET_PE_BENCHMARK = 23.7;
const MARKET_PB_BENCHMARK = 2.0;

// Giới hạn tín hiệu định giá để tránh fair value quá cực đoan
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function computeEnrichedFairValue(stock: StockInfo): number {
  const base =
    stock.initialPrice > 0 ? stock.initialPrice : stock.fundamentalValue;

  if (!base || base <= 0 || !isFinite(base)) return 1;

  let valuationSignal = 0;
  let weightSum = 0;

  /**
   * P/E signal:
   * Nếu P/E cổ phiếu thấp hơn benchmark thị trường -> có thể undervalued -> fair value cao hơn base.
   * Nếu P/E cổ phiếu cao hơn benchmark -> có thể overvalued -> fair value thấp hơn base.
   */
  if (stock.pe !== undefined && stock.pe > 0 && isFinite(stock.pe)) {
    const peSignal = clamp(MARKET_PE_BENCHMARK / stock.pe - 1, -0.5, 0.5);
    valuationSignal += peSignal * 0.65;
    weightSum += 0.65;
  }

  /**
   * P/B signal:
   * P/B chỉ dùng như tín hiệu phụ vì book value có thể không phản ánh tốt tài sản vô hình,
   * đặc biệt với công ty tăng trưởng, công nghệ, bán lẻ, dịch vụ.
   */
  if (stock.pb !== undefined && stock.pb > 0 && isFinite(stock.pb)) {
    const pbSignal = clamp(MARKET_PB_BENCHMARK / stock.pb - 1, -0.5, 0.5);
    valuationSignal += pbSignal * 0.35;
    weightSum += 0.35;
  }

  if (weightSum > 0) {
    valuationSignal = valuationSignal / weightSum;
  } else {
    valuationSignal = 0;
  }

  // Fair value được phép lệch tối đa ±20% so với initial price.
  // Dải ±6% cũ quá hẹp: fundamentalist luôn có tín hiệu yếu và dễ bị momentum áp đảo.
  // Với ±20%, fundamentalist phản ứng mạnh hơn khi thị trường over/undervalued,
  // đúng với thực tế thị trường Việt Nam và ABM literature (LeBaron 2006).
  const fairAdjustment = clamp(valuationSignal * 0.4, -0.20, 0.20);
  const fairValue = base * (1 + fairAdjustment);

  return Math.max(base * 0.80, Math.min(base * 1.20, fairValue));
}
