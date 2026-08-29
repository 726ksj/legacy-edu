import { describe, expect, it } from "vitest";
import { compareLessonTitles } from "./lessonOrdering";

describe("compareLessonTitles", () => {
  it("숫자가 커지는 순서대로 정렬한다", () => {
    expect(["3차", "1차", "2차"].sort(compareLessonTitles)).toEqual([
      "1차",
      "2차",
      "3차",
    ]);
  });

  it("두 자리 숫자를 문자열이 아니라 숫자로 비교한다 (10차가 2차보다 뒤)", () => {
    expect(["10차", "2차", "1차"].sort(compareLessonTitles)).toEqual([
      "1차",
      "2차",
      "10차",
    ]);
  });

  it("하이픈 세부 번호를 1강 < 1-1강 < 2강 순서로 끼워 넣는다", () => {
    expect(["1차", "2차", "1-1차"].sort(compareLessonTitles)).toEqual([
      "1차",
      "1-1차",
      "2차",
    ]);
  });

  it("세부 번호가 여러 개 섞여도 정확히 정렬한다", () => {
    expect(
      ["3차", "1차", "1-2차", "1-1차", "2차"].sort(compareLessonTitles),
    ).toEqual(["1차", "1-1차", "1-2차", "2차", "3차"]);
  });

  it("숫자가 없는 제목은 문자열 비교로 정렬한다", () => {
    expect(["나 강의", "가 강의"].sort(compareLessonTitles)).toEqual([
      "가 강의",
      "나 강의",
    ]);
  });
});
