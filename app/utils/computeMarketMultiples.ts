import { SIM_STOCKS } from "./stockData";

export function computeMarketMultiples(): {
  avgPE: number | null;
  avgPB: number | null;
} {
  const withPE = SIM_STOCKS.filter((s) => s.pe && s.pe > 0);
  const withPB = SIM_STOCKS.filter((s) => s.pb && s.pb > 0);
  return {
    avgPE:
      withPE.length > 0
        ? withPE.reduce((s, st) => s + (st.pe ?? 0), 0) / withPE.length
        : null,
    avgPB:
      withPB.length > 0
        ? withPB.reduce((s, st) => s + (st.pb ?? 0), 0) / withPB.length
        : null,
  };
}
