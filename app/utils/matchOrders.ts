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
  ticksPerDay: number,
): { trades: Trade[]; volumeDelta: number } {
  const trades: Trade[] = [];
  let volumeDelta = 0;
  let attempts = 0;

  while (lob.bids.length > 0 && lob.asks.length > 0 && attempts++ < 200) {
    const bb = lob.bids[0];
    const ba = lob.asks[0];

    if (bb.price < ba.price) break;

    /**
     * Giá khớp dùng midpoint giữa bid và ask thay vì lấy giá của lệnh nào vào trước.
     * Cách cũ dễ tạo bias vì nếu bid aggressive được tạo trước thì giá bị kéo lên mạnh.
     */
    const rawTradePrice = safe((bb.price + ba.price) / 2, lob.midPrice);

    const tradeQty = Math.min(bb.qty, ba.qty);

    if (rawTradePrice <= 0 || tradeQty <= 0) {
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

    /**
     * Không để 1 lệnh nhỏ làm mid-price nhảy toàn bộ về tradePrice.
     * Mid-price chỉ điều chỉnh một phần theo price impact.
     *
     * T+0 có impact lớn hơn T+2.5 vì thanh khoản quay vòng nhanh hơn,
     * nhưng vẫn không phải mỗi giao dịch nhỏ quyết định toàn bộ giá.
     */
    const impact = settlement === "T+0" ? 0.25 : 0.15;
    const tradePrice = safe(
      lob.midPrice + impact * (rawTradePrice - lob.midPrice),
      rawTradePrice,
    );

    const totalValue = tradePrice * tradeQty;
    // Phí giao dịch thực tế VN khoảng 0.15–0.25%, dùng đồng nhất cho cả T+0 và T+2.5
    const feeRate = 0.0015;
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

      // Settlement delay tính theo ticks/ngày của time scale hiện tại,
      // thay vì hằng số * 10 (quá ngắn so với thực tế).
      // Ví dụ 1D: T+2.5 = 2.5 * 60 = 150 tick; 1W: 2.5 * 400 = 1000 tick.
      const unlockTick = currentTick + Math.max(1, Math.round(settleDays * ticksPerDay));

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
