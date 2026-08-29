// 차시 제목은 "1강 - 문법 정리"처럼 앞에 번호가 붙는 관례고, "1-1강"
// 같은 세부 번호도 쓸 수 있다 (1강과 2강 사이에 끼워 넣는 용도). 그래서
// 맨 앞 숫자 하나만 뽑아 비교하면 "1-1강"과 "1강"이 같은 숫자로 취급돼
// 엉뚱한 위치로 밀린다. "-"/"."/"_"로 이어지는 숫자 전체를 버전처럼
// 세그먼트별로 비교해야 "1강 < 1-1강 < 2강" 순서가 나온다.
function parseLessonNumberSegments(title: string): number[] {
  const match = title.match(/\d+(?:[-._]\d+)*/);
  if (!match) return [];
  return match[0].split(/[-._]/).map(Number);
}

export function compareLessonTitles(a: string, b: string): number {
  const segmentsA = parseLessonNumberSegments(a);
  const segmentsB = parseLessonNumberSegments(b);

  const length = Math.max(segmentsA.length, segmentsB.length);
  for (let i = 0; i < length; i++) {
    // 세그먼트가 없는 쪽(예: "1강"의 두 번째 세그먼트)은 더 앞선 것으로
    // 취급해야 "1강"이 "1-1강"보다 앞에 온다.
    const valueA = segmentsA[i] ?? -1;
    const valueB = segmentsB[i] ?? -1;
    if (valueA !== valueB) return valueA - valueB;
  }

  return a.localeCompare(b, "ko");
}
