import stocksJson from "../data/stocks_data.json";
import type { StockInfo } from "../types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const STOCK_LENGTH = parseInt(process.env.NEXT_PUBLIC_STOCK_LENGTH ?? "50");
const API_LIMIT = 20; // vnstock rate-limit threshold

export async function fetchAllStocks(): Promise<Record<string, StockInfo>> {
  if (STOCK_LENGTH <= API_LIMIT) {
    const res = await fetch(
      `${API_BASE_URL}/api/stocks?length=${STOCK_LENGTH}`,
    );
    if (!res.ok) throw new Error(`GET /api/stocks → ${res.status}`);
    return res.json();
  }
  return stocksJson as unknown as Record<string, StockInfo>;
}

export async function fetchStock(symbol: string): Promise<StockInfo> {
  const res = await fetch(`${API_BASE_URL}/api/stocks/${symbol.toUpperCase()}`);
  if (!res.ok)
    throw new Error(
      `GET /api/stocks/${symbol} → ${res.status} ${await res.text()}`,
    );
  return res.json();
}
