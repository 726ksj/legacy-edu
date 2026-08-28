"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colorAt } from "./colors";

export default function GradeDonutChart({
  data,
}: {
  data: { grade: string; count: number }[];
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
          nameKey="grade"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.grade} fill={colorAt(index)} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}명`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
