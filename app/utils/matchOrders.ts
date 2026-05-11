import type {
  Agent,
  Order,
  Trade,
  SettlementType,
  ActiveAgentType,
  AgentTradeStat,
} from "../types";

export interface StockLOB {
  bids: Order[];
  asks: Order[];
  midPrice: number;
  priceHistory: number[];
}

export interface SettlementEntry {
  tick: number;
  agentId: number;
  symbol: string;
  cash: number;
  shares: number;
}

const safe = (v: number, fallback: number) =>
  isFinite(v) && !isNaN(v) ? v : fallback;

export function matchOrders(
  lob: StockLOB,
  sym: string,
  agents: Agent[],
  settlement: SettlementType,
  settlementQueue: SettlementEntry[],
  currentTick: number,
  tradesByType: Record<ActiveAgentType, AgentTradeStat>,
): { trades: Trade[]; volumeDelta: number } {
  const trades: Trade[] = [];
  let volumeDelta = 0;
  let attempts = 0;

  while (lob.bids.length > 0 && lob.asks.length > 0 && attempts++ < 200) {
    const bb = lob.bids[0];
    const ba = lob.asks[0];

    if (bb.price < ba.price) break;

   const rawTradePrice = safe((bb.price + ba.price) / 2, lob.midPrice);

// Giới hạn độ nhảy giá trong một lần khớp để tránh cây nến đầu bị spike.
// T+0 cho phép biến động nhanh hơn T+2.5 một chút.
const maxTradeMovePct = settlement === "T+0" ? 0.005 : 0.003;

const lowerBound = lob.midPrice * (1 - maxTradeMovePct);
const upperBound = lob.midPrice * (1 + maxTradeMovePct);

const tradePrice = safe(
  Math.min(upperBound, Math.max(lowerBound, rawTradePrice)),
  lob.midPrice,
);

const tradeQty = Math.min(bb.qty, ba.qty);

    if (tradePrice <= 0 || tradeQty <= 0) {
      lob.bids.shift();
      lob.asks.shift();
      continue;
    }

    const buyer = agents.find((a) => a.id === bb.agentId);
    const seller = agents.find((a) => a.id === ba.agentId);

    if (!buyer || !seller || buyer.id === seller.id) {
      lob.bids.shift();
      lob.asks.shift();
      continue;
    }

    const totalValue = tradePrice * tradeQty;
    const feeRate = settlement === "T+0" ? 0.0025 : 0.0002;
    const fee = totalValue * feeRate;

    if (buyer.cash < totalValue + fee) {
      lob.bids.shift();
      continue;
    }
    if (seller.shares[sym] < tradeQty) {
      lob.asks.shift();
      continue;
    }

    buyer.cash -= totalValue + fee;
    if (buyer.cash < 0) buyer.cash = 0;
    seller.shares[sym] -= tradeQty;

    const settleDays =
      settlement === "T+0"
        ? 0
        : settlement === "T+1"
          ? 1
          : settlement === "T+3"
            ? 3
            : 2.5;

    if (settleDays > 0) {
      buyer.lockedShares[sym] += tradeQty;
      seller.lockedCash += totalValue - fee;
      const unlockTick = currentTick + Math.round(settleDays * 10);
      settlementQueue.push(
        {
          tick: unlockTick,
          agentId: buyer.id,
          symbol: sym,
          cash: 0,
          shares: tradeQty,
        },
        {
          tick: unlockTick,
          agentId: seller.id,
          symbol: sym,
          cash: totalValue - fee,
          shares: 0,
        },
      );
    } else {
      buyer.shares[sym] += tradeQty;
      seller.cash += totalValue - fee;
    }

    volumeDelta += tradeQty;

    const bType = buyer.type as ActiveAgentType;
    const sType = seller.type as ActiveAgentType;
    if (tradesByType[bType]) {
      tradesByType[bType].count++;
      tradesByType[bType].value += totalValue;
    }
    if (tradesByType[sType]) {
      tradesByType[sType].count++;
      tradesByType[sType].value += totalValue;
    }

    trades.push({
      price: tradePrice,
      qty: tradeQty,
      timestamp: Date.now(),
      buyerType: buyer.type,
      sellerType: seller.type,
      symbol: sym,
    });

    bb.qty -= tradeQty;
    ba.qty -= tradeQty;
    if (bb.qty <= 0) lob.bids.shift();
    if (ba.qty <= 0) lob.asks.shift();
    lob.midPrice = tradePrice;
  }

  return { trades, volumeDelta };
}
