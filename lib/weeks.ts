// 강좌별 커리큘럼 주차 수의 상한(DB 제약과 동일).
export const MAX_WEEKS = 52;

// 1..totalWeeks. 주차를 쓰지 않는 강좌(null)는 빈 배열.
export function weeksOf(totalWeeks: number | null): number[] {
  return totalWeeks
    ? Array.from({ length: totalWeeks }, (_, i) => i + 1)
    : [];
}

function isValidWeek(week: number, totalWeeks: number) {
  return Number.isInteger(week) && week >= 1 && week <= totalWeeks;
}

// 라우트 파라미터(1~totalWeeks 또는 "none")를 주차 값으로 바꾼다. 잘못된
// 값은 undefined, 주차 미지정은 null.
export function parseWeekParam(
  param: string,
  totalWeeks: number,
): number | null | undefined {
  if (param === "none") return null;
  const week = Number(param);
  return isValidWeek(week, totalWeeks) ? week : undefined;
}

// 폼 값("" 또는 숫자)을 주차 값으로 바꾼다. 비어 있거나 숫자가 아니면 null.
// 강좌별 상한은 서버에서 validateWeekForCourse로 확인한다.
export function parseWeekField(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const week = Number(text);
  return isValidWeek(week, MAX_WEEKS) ? week : null;
}

function formatMonthDay(date: Date) {
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

// 강좌 시작일(YYYY-MM-DD) 기준 N주차의 날짜 범위. 시작일이 없으면 null.
export function weekDateRange(
  startDate: string | null,
  week: number,
): string | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const from = new Date(start);
  from.setUTCDate(from.getUTCDate() + (week - 1) * 7);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 6);
  return `${formatMonthDay(from)} ~ ${formatMonthDay(to)}`;
}

// 강좌 시작일 기준 오늘(KST)이 몇 주차인지. 시작 전이거나 마지막 주차가
// 지났거나 시작일이 없으면 null.
export function currentWeek(
  startDate: string | null,
  totalWeeks: number,
  now: Date = new Date(),
): number | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
  );
  const days = Math.floor((today - start.getTime()) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return days >= 0 && week <= totalWeeks ? week : null;
}

// 강좌 종료 예정일(시작일 + 주차 수 - 1일)을 "YYYY.M.D" 형태로.
export function courseEndLabel(
  startDate: string | null,
  totalWeeks: number,
): string | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  start.setUTCDate(start.getUTCDate() + totalWeeks * 7 - 1);
  return `${start.getUTCFullYear()}.${start.getUTCMonth() + 1}.${start.getUTCDate()}`;
}

export function courseStartLabel(startDate: string | null): string | null {
  if (!startDate) return null;
  const [y, m, d] = startDate.split("-").map(Number);
  return y && m && d ? `${y}.${m}.${d}` : null;
}
