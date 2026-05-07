import { TABS } from "../constants/ui";
import type { ActiveTab } from "../types";

interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="bg-slate-900 border-b border-slate-900 px-3.5 flex shrink-0">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`bg-transparent border-0 border-b-2 px-3.5 py-2.5 cursor-pointer text-xs transition-colors ${
            activeTab === t.id
              ? "border-blue-500 text-blue-300 font-bold"
              : "border-transparent text-gray-600 hover:text-gray-400"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
