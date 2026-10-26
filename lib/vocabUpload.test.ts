import { describe, expect, it } from "vitest";
import {
  annotateVocabRows,
  countVocabErrors,
  findMissingHeaders,
  normalizeHeader,
} from "./vocabUpload";

describe("findMissingHeaders", () => {
  it("네 열이 모두 있으면 빈 배열", () => {
    expect(findMissingHeaders(["단어", "뜻", "예시 문장", "예시 문장 뜻"])).toEqual([]);
  });
  it("예시 문장 별칭을 인정한다", () => {
    expect(findMissingHeaders(["단어", "뜻", "예문", "예문 뜻"])).toEqual([]);
    expect(findMissingHeaders(["단어", "뜻", "예시문장", "예시문장뜻"])).toEqual([]);
  });
  it("예시 문장 뜻 열이 없으면 누락으로 알려 준다", () => {
    expect(findMissingHeaders(["단어", "뜻", "예시 문장"])).toEqual(["예시 문장 뜻"]);
  });
  it("예시 문장 뜻 열 이름은 예시 문장과 구분된다", () => {
    expect(normalizeHeader("예시 문장 뜻")).toBe("예시 문장 뜻");
    expect(normalizeHeader("예문 뜻")).toBe("예시 문장 뜻");
    expect(normalizeHeader("예문")).toBe("예시 문장");
  });
  it("없는 열 이름을 알려 준다", () => {
    expect(findMissingHeaders(["단어"])).toEqual(["뜻", "예시 문장", "예시 문장 뜻"]);
  });
});

describe("annotateVocabRows", () => {
  it("예시 문장 뜻이 비어 있으면 오류", () => {
    const rows = annotateVocabRows([
      { row: 2, word: "a", meaning: "가", example: "x", exampleMeaning: " " },
    ]);
    expect(rows[0].error).toContain("예시 문장 뜻");
    expect(countVocabErrors(rows)).toBe(1);
  });
  it("정상 행에는 오류가 없다", () => {
    const rows = annotateVocabRows([
      { row: 2, word: "apple", meaning: "사과", example: "I eat an apple.", exampleMeaning: "해석" },
    ]);
    expect(rows[0].error).toBeUndefined();
  });

  it("단어, 뜻, 예시 문장이 비면 오류", () => {
    const rows = annotateVocabRows([
      { row: 2, word: "apple", meaning: "", example: "", exampleMeaning: "해석" },
    ]);
    expect(rows[0].error).toBe("뜻, 예시 문장이(가) 비어 있습니다.");
  });

  it("중복 단어는 두 번째부터 오류(대소문자 무시)", () => {
    const rows = annotateVocabRows([
      { row: 2, word: "Apple", meaning: "사과", example: "a", exampleMeaning: "해석" },
      { row: 3, word: "apple", meaning: "사과", example: "b", exampleMeaning: "해석" },
    ]);
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toBe("2행과 같은 단어입니다.");
    expect(countVocabErrors(rows)).toBe(1);
  });

  it("앞뒤 공백을 제거한다", () => {
    const rows = annotateVocabRows([
      { row: 2, word: " apple ", meaning: " 사과", example: " x ", exampleMeaning: "해석" },
    ]);
    expect(rows[0]).toMatchObject({ word: "apple", meaning: "사과", example: "x", exampleMeaning: "해석" });
  });
});
