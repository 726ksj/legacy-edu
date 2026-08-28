"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colorAt } from "./colors";

export default function DonutChart({
  data,
  unit = "건",
}: {
  data: { label: string; count: number }[];
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-zinc-400">
        데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={colorAt(index)} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}${unit}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
