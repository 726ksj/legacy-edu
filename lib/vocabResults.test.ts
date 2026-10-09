import { describe, expect, it } from "vitest";
import {
  buildStudentResults,
  buildStudentWrongSummary,
  buildWordStats,
  compositeScore,
  summarizeResults,
  type ResultAttempt,
  type ResultNote,
  type ResultStudent,
} from "./vocabResults";

const student = (id: string, name: string): ResultStudent => ({
  id,
  name,
  username: id,
  school: null,
  grade: null,
});

const attempt = (
  profile_id: string,
  round_no: number,
  score: number | null,
  status: "in_progress" | "completed" = "completed",
): ResultAttempt => ({ profile_id, round_no, status, score, correct_count: 0, total_count: 6 });

describe("compositeScore", () => {
  it("1회 40% + 최종 60%를 반올림한다", () => {
    expect(compositeScore(33.3, 66.7)).toBe(53);
  });
  it("최종이 없으면 null", () => {
    expect(compositeScore(80, null)).toBeNull();
  });
});

describe("buildStudentResults", () => {
  const students = [student("a", "가"), student("b", "나"), student("c", "다")];
  const rows = buildStudentResults(students, [
    attempt("a", 1, 33.3),
    attempt("a", 2, 50),
    attempt("a", 3, 66.7),
    attempt("b", 1, null, "in_progress"),
  ]);

  it("3회까지 끝낸 학생은 완료와 종합 점수", () => {
    expect(rows[0]).toMatchObject({ status: "completed", firstScore: 33.3, finalScore: 66.7, totalScore: 53 });
  });
  it("시도만 있으면 진행 중, 없으면 미응시", () => {
    expect(rows[1].status).toBe("in_progress");
    expect(rows[1].firstScore).toBeNull();
    expect(rows[2].status).toBe("not_started");
  });
  it("요약", () => {
    expect(summarizeResults(rows)).toEqual({ completed: 1, inProgress: 1, notStarted: 1, averageTotal: 53 });
  });
});

describe("오답 집계", () => {
  const notes: ResultNote[] = [
    { profile_id: "a", word_id: "w1", wrong_count: 3, status: "active", return_count: 0 },
    { profile_id: "b", word_id: "w1", wrong_count: 1, status: "graduated", return_count: 0 },
    { profile_id: "a", word_id: "w2", wrong_count: 5, status: "active", return_count: 1 },
  ];

  it("많이 틀린 단어: 틀린 학생 수 → 총 횟수 순", () => {
    const stats = buildWordStats(notes);
    expect(stats.map((s) => s.wordId)).toEqual(["w1", "w2"]);
    expect(stats[0]).toMatchObject({ wrongStudents: 2, activeStudents: 1, totalWrong: 4 });
  });

  it("학생별 남은 오답과 점검 필요(임계값)", () => {
    const rows = buildStudentWrongSummary([student("a", "가"), student("b", "나"), student("c", "다")], notes, 2);
    expect(rows[0]).toMatchObject({ active: 2, mastered: 0, returned: 1, needsReview: true });
    expect(rows[1].student.id).toBe("b");
    expect(rows[1]).toMatchObject({ active: 0, mastered: 1, needsReview: false });
    expect(rows[2].active).toBe(0);
  });
});
