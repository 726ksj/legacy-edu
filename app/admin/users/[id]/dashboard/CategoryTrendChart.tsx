"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "@/components/admin/charts/colors";

export default function CategoryTrendChart({
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
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}점`} />
        <Legend />
        {categoryLabels.map((label, index) => (
          <Line
            key={label}
            type="monotone"
            dataKey={label}
            stroke={colorAt(index)}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
