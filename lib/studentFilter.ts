// 수강생 목록/추가 화면의 검색·필터. 서버/클라이언트 어디서든 같은 규칙을 쓰도록
// 순수 함수로 두고 단위 테스트한다.

export interface FilterableStudent {
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
}

export interface StudentFilter {
  // 공백으로 나눈 단어를 모두 포함해야 한다(이름·아이디·학교·학년 중 어디든).
  query: string;
  // 빈 문자열이면 전체.
  school: string;
  grade: string;
}

export const NO_FILTER: StudentFilter = { query: "", school: "", grade: "" };

// 학교/학년이 비어 있는 학생을 고를 때 쓰는 값.
export const UNSET = "__unset__";

export function filterStudents<T extends FilterableStudent>(
  students: T[],
  filter: StudentFilter,
): T[] {
  const tokens = filter.query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return students.filter((student) => {
    if (filter.school) {
      const match =
        filter.school === UNSET ? !student.school : student.school === filter.school;
      if (!match) return false;
    }
    if (filter.grade) {
      const match =
        filter.grade === UNSET ? !student.grade : student.grade === filter.grade;
      if (!match) return false;
    }
    if (tokens.length === 0) return true;

    const haystack = [student.name, student.username, student.school, student.grade]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    return tokens.every((token) => haystack.some((value) => value.includes(token)));
  });
}

// 필터 선택지: 값이 있는 것만 가나다순으로 중복 없이.
export function distinctOptions(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort(
    (a, b) => a.localeCompare(b, "ko"),
  );
}
