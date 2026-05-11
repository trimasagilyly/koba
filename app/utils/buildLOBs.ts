import { SIM_STOCKS, SIM_SYMBOLS } from "./stockData";
import { buildInitialPrices } from "./buildInitialPrices";
import type { StockLOB } from "./matchOrders";

/**
 * Tạo lịch sử giá trung tính tuyệt đối.
 *
 * Lý do:
 * - Nếu dùng priceHistory thật: momentum có thể bị bơm sẵn xu hướng tăng/giảm.
 * - Nếu dùng random noise: với momentum 60%, chỉ cần noise âm/dương nhẹ cũng tạo trend ban đầu.
 * - Lịch sử phẳng giúp mô phỏng bắt đầu từ trạng thái không thiên lệch.
 */
function buildFlatHistory(price: number, length = 60): number[] {
  return Array.from({ length }, () => price);
}

export function buildLOBs(): Record<string, StockLOB> {
  const initialPrices = buildInitialPrices();
  const lobs: Record<string, StockLOB> = {};

  for (let i = 0; i < SIM_SYMBOLS.length; i++) {
    const sym = SIM_SYMBOLS[i];
    const stock = SIM_STOCKS[i];
    const price = initialPrices[sym] ?? stock.initialPrice;

    lobs[sym] = {
      bids: [],
      asks: [],
      midPrice: price,
      priceHistory: buildFlatHistory(price, 60),
    };
  }

  return lobs;
}
