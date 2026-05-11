import { SIM_STOCKS, SIM_SYMBOLS } from "./stockData";
import { buildInitialPrices } from "./buildInitialPrices";
import type { StockLOB } from "./matchOrders";

/**
 * Tạo lịch sử giá trung tính quanh initial price.
 *
 * Lý do:
 * Nếu dùng stock.priceHistory thật ngay từ đầu, nhiều mã có sẵn xu hướng tăng,
 * làm momentum agents nhận tín hiệu mua ngay ở tick đầu.
 *
 * Trong mô phỏng ABM, nên bắt đầu từ trạng thái trung tính để xu hướng tăng/giảm
 * phát sinh nội sinh từ tương tác agent, không phải do dữ liệu lịch sử bơm sẵn.
 */
function buildNeutralHistory(price: number, length = 60): number[] {
  const history: number[] = [];

  for (let i = 0; i < length; i++) {
    const tinyNoise = (Math.random() - 0.5) * 0.002; // ±0.1%
    history.push(price * (1 + tinyNoise));
  }

  history[history.length - 1] = price;
  return history;
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
      priceHistory: buildNeutralHistory(price, 60),
    };
  }

  return lobs;
}
