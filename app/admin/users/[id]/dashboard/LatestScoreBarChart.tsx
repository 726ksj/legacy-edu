"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "@/components/admin/charts/colors";

export default function LatestScoreBarChart({
  data,
}: {
  data: { label: string; percent: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-zinc-400">
        데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={100} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}점`} />
        <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={colorAt(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
