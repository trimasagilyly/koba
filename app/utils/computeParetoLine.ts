import type { Agent } from "../types";

export interface ParetoDataPoint {
  groupLabel: string;      // Tên nhóm (vd: "Top 10%", "10-20%")
  wealthSharePct: number;  // % tài sản nhóm này chiếm giữ (Dùng cho Biểu đồ Cột)
  cumulativePct: number;   // % tài sản tích lũy cộng dồn (Dùng cho Đường Line)
}

export function computeParetoDistribution(
  agents: Agent[],
  midPrice: number,
): ParetoDataPoint[] {
  // 1. Tính tổng tài sản của từng Agent
  const wealth = agents.map((a) => {
    const totalShares = Object.values(a.shares || {}).reduce(
      (s, v) => s + v,
      0,
    );
    const totalLocked = Object.values(a.lockedShares || {}).reduce(
      (s, v) => s + v,
      0,
    );
    return Math.max(
      0,
      (a.cash || 0) +
        (a.lockedCash || 0) +
        (totalShares + totalLocked) * (midPrice || 0),
    );
  });

  // 2. Sắp xếp tài sản GIẢM DẦN (Từ Giàu nhất -> Nghèo nhất theo chuẩn Pareto của PDF)
  wealth.sort((a, b) => b - a);
  
  const totalWealth = wealth.reduce((s, v) => s + v, 0);
  if (totalWealth === 0) return [];

  const n = wealth.length;
  const numBuckets = 10; // Chia thành 10 cột, mỗi cột 10% dân số
  const result: ParetoDataPoint[] = [];
  let cumulativeShare = 0;

  // 3. Tính toán tỷ trọng cho từng nhóm 10%
  for (let i = 0; i < numBuckets; i++) {
    // Tính toán index bắt đầu và kết thúc cho bucket hiện tại
    const startIdx = Math.floor((i * n) / numBuckets);
    const endIdx = Math.floor(((i + 1) * n) / numBuckets);
    
    let bucketWealth = 0;
    for (let j = startIdx; j < endIdx; j++) {
      bucketWealth += wealth[j];
    }

    const wealthShare = bucketWealth / totalWealth;
    cumulativeShare += wealthShare;

    // Đặt tên nhãn cho trục X
    const groupLabel = i === 0 ? "Top 10%" : `${i * 10}-${(i + 1) * 10}%`;

    result.push({
      groupLabel,
      wealthSharePct: wealthShare * 100, // Nhân 100 để ra dạng phần trăm (%)
      cumulativePct: cumulativeShare * 100, // Tích lũy dạng phần trăm (%)
    });
  }

  return result;
}