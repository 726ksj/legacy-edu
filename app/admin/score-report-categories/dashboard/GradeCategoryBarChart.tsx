"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./colors";

export default function GradeCategoryBarChart({
  data,
  categoryLabels,
}: {
  data: Record<string, string | number>[];
  categoryLabels: string[];
}) {
  if (data.length === 0 || categoryLabels.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-zinc-400">
        데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 60)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
        <YAxis dataKey="grade" type="category" tick={{ fontSize: 12 }} width={56} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}점`} />
        <Legend />
        {categoryLabels.map((label, index) => (
          <Bar key={label} dataKey={label} fill={colorAt(index)} radius={[0, 4, 4, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
