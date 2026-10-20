import { describe, expect, it } from "vitest";
import {
  annotateWritingRows,
  countWritingErrors,
  findMissingWritingHeaders,
  normalizeWritingHeader,
  type WritingRowInput,
} from "./writingUpload";

const input = (overrides: Partial<WritingRowInput> = {}): WritingRowInput => ({
  row: 2,
  english: "I eat an apple every morning.",
  korean: "나는 매일 아침 사과를 먹는다.",
  chunksText: "",
  ...overrides,
});

describe("findMissingWritingHeaders", () => {
  it("필수 열(영어 문장, 뜻)만 확인한다", () => {
    expect(findMissingWritingHeaders(["영어 문장", "뜻"])).toEqual([]);
    expect(findMissingWritingHeaders(["영어 문장"])).toEqual(["뜻"]);
  });

  it("이전 양식의 '우리말' 열 제목도 '뜻'으로 인정한다", () => {
    expect(findMissingWritingHeaders(["영어 문장", "우리말"])).toEqual([]);
    expect(normalizeWritingHeader(" 우리말 ")).toBe("뜻");
    expect(normalizeWritingHeader("뜻")).toBe("뜻");
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

  it("배열 단위는 '/'로 나누고 앞뒤 공백을 정리한다", () => {
    const [row] = annotateWritingRows([
      input({ chunksText: "I eat /  an apple / every morning." }),
    ]);
    expect(row.error).toBeUndefined();
    expect(row.chunks).toEqual(["I eat", "an apple", "every morning."]);
  });

  it("영어 문장과 뜻은 필수", () => {
    const [row] = annotateWritingRows([input({ korean: "" })]);
    expect(row.error).toBe("뜻이(가) 비어 있습니다.");
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
