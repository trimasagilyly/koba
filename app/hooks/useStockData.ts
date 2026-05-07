import { useState, useEffect } from "react";
import { fetchAllStocks, initStockData, API_BASE_URL } from "../constants";
import type { StockInfo } from "../types";

export type StockLoadState = "loading" | "ready" | "error";

export function useStockData() {
  const [loadState, setLoadState] = useState<StockLoadState>("loading");
  const [stockCount, setStockCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllStocks()
      .then((raw: Record<string, StockInfo>) => {
        initStockData(raw);
        setStockCount(Object.keys(raw).length);
        setLoadState("ready");
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoadState("error");
      });
  }, []);

  return { loadState, stockCount, error, apiUrl: API_BASE_URL };
}
