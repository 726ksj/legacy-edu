import { describe, expect, it } from "vitest";
import {
  annotateWritingRows,
  countWritingErrors,
  findMissingWritingHeaders,
  type WritingRowInput,
} from "./writingUpload";

const input = (overrides: Partial<WritingRowInput> = {}): WritingRowInput => ({
  row: 2,
  english: "I eat an apple every morning.",
  korean: "나는 매일 아침 사과를 먹는다.",
  chunksText: "",
  keyPhrasesText: "",
  ...overrides,
});

describe("findMissingWritingHeaders", () => {
  it("필수 열(영어 문장, 우리말)만 확인한다", () => {
    expect(findMissingWritingHeaders(["영어 문장", "우리말"])).toEqual([]);
    expect(findMissingWritingHeaders(["영어 문장"])).toEqual(["우리말"]);
  });
});

describe("annotateWritingRows", () => {
  it("배열 단위를 비우면 공백 기준으로 자동 분할한다", () => {
    const [row] = annotateWritingRows([input()]);
    expect(row.error).toBeUndefined();
    expect(row.chunks).toEqual(["I", "eat", "an", "apple", "every", "morning."]);
  });

  it("직접 나눈 배열 단위를 쓰고, 이어 붙이면 문장과 같아야 한다", () => {
    const [ok] = annotateWritingRows([input({ chunksText: "I eat / an apple / every morning." })]);
    expect(ok.error).toBeUndefined();
    expect(ok.chunks).toEqual(["I eat", "an apple", "every morning."]);

    const [bad] = annotateWritingRows([input({ chunksText: "I eat / a banana" })]);
    expect(bad.error).toBe("배열 단위를 이어 붙이면 영어 문장과 같아야 합니다.");
  });

  it("배열 단위는 2개 이상", () => {
    const [row] = annotateWritingRows([input({ english: "Hello", korean: "안녕", chunksText: "Hello" })]);
    expect(row.error).toBe("배열 단위가 2개 이상이어야 합니다.");
  });

  it("핵심 어구는 배열 단위 중 하나여야 한다", () => {
    const [ok] = annotateWritingRows([
      input({ chunksText: "I eat / an apple / every morning.", keyPhrasesText: "an apple" }),
    ]);
    expect(ok.error).toBeUndefined();
    expect(ok.keyPhrases).toEqual(["an apple"]);

    const [bad] = annotateWritingRows([
      input({ chunksText: "I eat / an apple / every morning.", keyPhrasesText: "a banana" }),
    ]);
    expect(bad.error).toBe('핵심 어구 "a banana"가 배열 단위에 없습니다.');
  });

  it("영어 문장과 우리말은 필수", () => {
    const [row] = annotateWritingRows([input({ korean: "" })]);
    expect(row.error).toBe("우리말이(가) 비어 있습니다.");
  });

  it("같은 영어 문장은 두 번째부터 오류(대소문자·공백 무시)", () => {
    const rows = annotateWritingRows([
      input({ row: 2 }),
      input({ row: 3, english: "i eat  an apple every morning." }),
    ]);
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toBe("2행과 같은 문장입니다.");
    expect(countWritingErrors(rows)).toBe(1);
  });
});
