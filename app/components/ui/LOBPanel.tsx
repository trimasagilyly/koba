import type { Order } from "../../types";

export default function LOBPanel({
  bids,
  asks,
  midPrice,
}: {
  bids: Order[];
  asks: Order[];
  midPrice: number;
}) {
  const topAsks = [...asks].sort((a, b) => a.price - b.price).slice(0, 7);
  const topBids = [...bids].sort((a, b) => b.price - a.price).slice(0, 7);
  const maxQty = Math.max(...[...topAsks, ...topBids].map((o) => o.qty), 1);

  return (
    <div className="font-mono text-xs">
      {/* Header */}
      <div className="grid grid-cols-2 gap-0.5 mb-1.5">
        <div className="text-gray-600 text-xs">Giá</div>
        <div className="text-gray-600 text-xs text-right">Khối lượng</div>
      </div>

      {/* Asks (sell side) */}
      {topAsks.reverse().map((o) => (
        <div key={o.id} className="grid grid-cols-2 gap-0.5 mb-px relative">
          <div
            className="absolute right-0 top-0 h-full bg-red-950 opacity-40"
            style={{ width: `${(o.qty / maxQty) * 100}%` }}
          />
          <div className="text-red-400 relative">{o.price.toFixed(2)}</div>
          <div className="text-gray-500 text-right relative">
            {o.qty.toLocaleString()}
          </div>
        </div>
      ))}

      {/* Mid price separator */}
      <div className="border-t border-b border-slate-700 py-1 my-1 text-center">
        <span className="text-sm font-bold text-slate-100">
          {midPrice.toFixed(2)}
        </span>
        <span className="text-xs text-gray-600 ml-1">mid</span>
      </div>

      {/* Bids (buy side) */}
      {topBids.map((o) => (
        <div key={o.id} className="grid grid-cols-2 gap-0.5 mb-px relative">
          <div
            className="absolute right-0 top-0 h-full bg-emerald-950 opacity-40"
            style={{ width: `${(o.qty / maxQty) * 100}%` }}
          />
          <div className="text-emerald-400 relative">{o.price.toFixed(2)}</div>
          <div className="text-gray-500 text-right relative">
            {o.qty.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
