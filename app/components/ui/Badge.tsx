export type BadgeVariant =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "purple"
  | "cyan"
  | "gray";

const variantClasses: Record<BadgeVariant, string> = {
  blue: "bg-blue-950 text-blue-400 border border-blue-800",
  green: "bg-emerald-950 text-emerald-400 border border-emerald-800",
  red: "bg-red-950 text-red-400 border border-red-800",
  yellow: "bg-yellow-950 text-yellow-400 border border-yellow-800",
  purple: "bg-violet-950 text-violet-400 border border-violet-800",
  cyan: "bg-cyan-950 text-cyan-400 border border-cyan-800",
  gray: "bg-gray-900 text-gray-400 border border-gray-700",
};

export default function Badge({
  children,
  variant = "blue",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`text-xs font-bold px-1.5 py-0.5 rounded tracking-wide ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
