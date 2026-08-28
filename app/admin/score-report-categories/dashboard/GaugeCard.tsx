"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

function gaugeColor(percent: number) {
  if (percent >= 80) return "#4fb28b";
  if (percent >= 60) return "#fbbf24";
  return "#f87171";
}

export default function GaugeCard({
  label,
  average,
  sampleCount,
}: {
  label: string;
  average: number | null;
  sampleCount: number;
}) {
  const value = average === null ? 0 : Math.max(0, Math.min(100, average));
  const color = average === null ? "#d4d4d8" : gaugeColor(value);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="truncate text-sm font-semibold text-zinc-900">{label}</p>
      <div className="relative mt-1 flex justify-center">
        <RadialBarChart
          width={160}
          height={100}
          cx="50%"
          cy="100%"
          innerRadius="75%"
          outerRadius="100%"
          barSize={12}
          startAngle={180}
          endAngle={0}
          data={[{ value }]}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={6} fill={color} />
        </RadialBarChart>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="text-xl font-bold text-zinc-900">
            {average === null ? "-" : average.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-zinc-400">
        <span>0</span>
        <span>숫자 점수 {sampleCount}건</span>
        <span>100</span>
      </p>
    </div>
  );
}
