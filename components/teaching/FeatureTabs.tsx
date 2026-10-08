"use client";

import { useState, type ReactNode } from "react";

interface Tab {
  key: string;
  label: string;
  // null이면 아직 구현되지 않은 기능으로 "준비 중"을 보여준다.
  content: ReactNode | null;
}

export default function FeatureTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((tab) => tab.key === active);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={
              "-mb-px border-b-2 px-4 py-2 text-sm font-semibold " +
              (tab.key === active
                ? "border-brand text-brand-dark"
                : "border-transparent text-zinc-500 hover:text-zinc-800")
            }
          >
            {tab.label}
            {tab.content === null && (
              <span className="ml-1.5 text-[10px] font-medium text-zinc-400">
                준비 중
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {current?.content ?? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-400">
            {current?.label} 기능은 준비 중입니다.
          </p>
        )}
      </div>
    </div>
  );
}
