// 강사용 단어 결과 화면의 집계 로직. DB 조회와 분리한 순수 함수라 테스트하기
// 쉽고, 학생 앱의 점수 규칙(종합 = 1회 40% + 최종 60%)과 같은 값을 쓴다.

// 남은 오답이 이 개수 이상이면 "점검 필요"로 표시한다(화면설계서 기준).
export const REVIEW_NEEDED_THRESHOLD = 20;

export interface ResultStudent {
  id: string;
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
}

export interface ResultAttempt {
  profile_id: string;
  round_no: number;
  status: "in_progress" | "completed";
  score: number | null;
  correct_count: number | null;
  total_count: number;
}

export interface ResultNote {
  profile_id: string;
  word_id: string;
  wrong_count: number;
  status: "active" | "graduated";
  return_count: number;
}

export type ResultStatus = "not_started" | "in_progress" | "completed";

export interface StudentResultRow {
  student: ResultStudent;
  rounds: Record<number, ResultAttempt | undefined>;
  firstScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  status: ResultStatus;
}

export function compositeScore(first: number | null, final: number | null): number | null {
  if (final === null) return null;
  return Math.round((first ?? 0) * 0.4 + final * 0.6);
}

// 선택한 단어장에 대한 학생별 결과. 응시 기록이 없는 학생도 "미응시"로 포함한다.
export function buildStudentResults(
  students: ResultStudent[],
  attempts: ResultAttempt[],
): StudentResultRow[] {
  const byStudent = new Map<string, ResultAttempt[]>();
  for (const attempt of attempts) {
    const list = byStudent.get(attempt.profile_id) ?? [];
    list.push(attempt);
    byStudent.set(attempt.profile_id, list);
  }

  return students.map((student) => {
    const list = byStudent.get(student.id) ?? [];
    const rounds: Record<number, ResultAttempt | undefined> = {};
    for (const attempt of list) rounds[attempt.round_no] = attempt;

    const first = rounds[1]?.status === "completed" ? (rounds[1]?.score ?? null) : null;
    const final = rounds[3]?.status === "completed" ? (rounds[3]?.score ?? null) : null;

    let status: ResultStatus = "not_started";
    if (final !== null) status = "completed";
    else if (list.length > 0) status = "in_progress";

    return {
      student,
      rounds,
      firstScore: first,
      finalScore: final,
      totalScore: compositeScore(first, final),
      status,
    };
  });
}

export interface ResultSummary {
  completed: number;
  inProgress: number;
  notStarted: number;
  averageTotal: number | null;
}

export function summarizeResults(rows: StudentResultRow[]): ResultSummary {
  const scores = rows.map((r) => r.totalScore).filter((s): s is number => s !== null);
  return {
    completed: rows.filter((r) => r.status === "completed").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    notStarted: rows.filter((r) => r.status === "not_started").length,
    averageTotal:
      scores.length === 0 ? null : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  };
}

export interface WordStat {
  wordId: string;
  // 이 단어를 한 번이라도 틀린 학생 수.
  wrongStudents: number;
  // 아직 마스터하지 못한(남은 오답) 학생 수.
  activeStudents: number;
  totalWrong: number;
}

// 반에서 많이 틀린 단어: 틀린 학생 수 → 총 틀린 횟수 순.
export function buildWordStats(notes: ResultNote[]): WordStat[] {
  const stats = new Map<string, WordStat>();
  for (const note of notes) {
    const stat = stats.get(note.word_id) ?? {
      wordId: note.word_id,
      wrongStudents: 0,
      activeStudents: 0,
      totalWrong: 0,
    };
    stat.wrongStudents += 1;
    if (note.status === "active") stat.activeStudents += 1;
    stat.totalWrong += note.wrong_count;
    stats.set(note.word_id, stat);
  }
  return [...stats.values()].sort(
    (a, b) => b.wrongStudents - a.wrongStudents || b.totalWrong - a.totalWrong,
  );
}

export interface StudentWrongRow {
  student: ResultStudent;
  active: number;
  mastered: number;
  returned: number;
  needsReview: boolean;
}

// 학생별 남은 오답. 남은 오답이 많은 순.
export function buildStudentWrongSummary(
  students: ResultStudent[],
  notes: ResultNote[],
  threshold: number = REVIEW_NEEDED_THRESHOLD,
): StudentWrongRow[] {
  const byStudent = new Map<string, ResultNote[]>();
  for (const note of notes) {
    const list = byStudent.get(note.profile_id) ?? [];
    list.push(note);
    byStudent.set(note.profile_id, list);
  }

  return students
    .map((student) => {
      const list = byStudent.get(student.id) ?? [];
      const active = list.filter((n) => n.status === "active").length;
      return {
        student,
        active,
        mastered: list.filter((n) => n.status === "graduated").length,
        returned: list.filter((n) => n.return_count > 0).length,
        needsReview: active >= threshold,
      };
    })
    .sort((a, b) => b.active - a.active || a.student.name.localeCompare(b.student.name, "ko"));
}
