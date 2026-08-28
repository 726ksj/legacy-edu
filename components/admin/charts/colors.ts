export const CHART_COLORS = [
  "#4fb28b",
  "#e88c9a",
  "#60a5fa",
  "#fbbf24",
  "#a78bfa",
  "#34d399",
  "#f87171",
  "#38bdf8",
];

export function colorAt(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
