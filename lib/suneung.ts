// 2026학년도 수능(2026-11-19, 목) 기준 D-day. 헤더의 카운트다운 배지에서만
// 쓰이는 값이라 하드코딩해뒀다 - 다음 연도 수능이 정해지면 이 값만
// 바꾸면 된다.
const SUNEUNG_DATE = "2026-11-19";

function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
}

// 수능 당일이면 0, 지나면 음수를 반환한다 - 호출부에서 표시 여부를 정한다.
export function getSuneungDday(): number {
  const today = new Date(`${todayInSeoul()}T00:00:00+09:00`);
  const target = new Date(`${SUNEUNG_DATE}T00:00:00+09:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}
