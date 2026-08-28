// score_reports.score는 자유 텍스트라 "92", "92.5" 같은 숫자뿐 아니라
// "A+" 같은 등급도 들어올 수 있다. 대시보드 집계는 숫자로 해석되는
// 값만 대상으로 하고, 나머지는 조용히 제외한다.
export function parseNumericScore(raw: string): number | null {
  const match = raw.trim().match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function scoreToPercent(raw: string, maxScore: number): number | null {
  if (maxScore <= 0) return null;
  const value = parseNumericScore(raw);
  if (value === null) return null;
  return (value / maxScore) * 100;
}
