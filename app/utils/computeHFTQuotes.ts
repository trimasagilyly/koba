// Avellaneda-Stoikov (2008) market-making model
export function computeHFTQuotes(
  mid: number,
  inventory: number,
  targetInventory: number,
  sigma: number,
  isT0: boolean,
): { resPrice: number; spreadHalf: number } {
  if (targetInventory <= 0 || mid <= 0)
    return { resPrice: mid, spreadHalf: mid * 0.001 };

  const q = Math.max(
    -1,
    Math.min(1, (inventory - targetInventory) / targetInventory),
  );
  const sigmaPct = sigma > 0 ? sigma / mid : 0.002;
  // gamma = 0.001 (hằng số tuyệt đối, không chia cho mid):
  // Với sigma ~ 100 VND, riskPremium = q * 0.001 * 100^2 = 10 VND ≈ 0.1% của giá
  // → inventory adjustment có ý nghĩa thực tế, thay vì gần bằng 0 như trước.
  const gamma = 0.001;
  const kappa = 1.5;

  const riskPremium = q * gamma * sigma * sigma;
  const resPrice =
    mid - Math.max(-mid * 0.05, Math.min(mid * 0.05, riskPremium));

  let delta = gamma * sigma * sigma + (2 / gamma) * Math.log(1 + gamma / kappa);
  delta = delta * (1 + 12 * sigmaPct);
  delta = delta * (isT0 ? 0.8 : 1.2);
  delta = Math.max(mid * 0.001, Math.min(mid * 0.015, delta));

  return { resPrice, spreadHalf: delta / 2 };
}
