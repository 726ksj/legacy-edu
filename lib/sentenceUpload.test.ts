import { describe, expect, it } from "vitest";
import {
  MAX_SENTENCES,
  annotateSentenceRows,
  countSentenceErrors,
  findMissingSentenceHeaders,
  type SentenceRowInput,
} from "./sentenceUpload";

const cells = (...values: string[]) => [...values, ...Array(MAX_SENTENCES - values.length).fill("")];

const input = (overrides: Partial<SentenceRowInput> = {}): SentenceRowInput => ({
  row: 2,
  intro: "You already have a business.",
  cells: cells("If all you do is promote, who will read?", "So write about things they like.", "Only then can you sell."),
  ...overrides,
});

describe("findMissingSentenceHeaders", () => {
  it("첫 문장과 1~3번째가 필요하고 4번째 이후는 없어도 된다", () => {
    expect(findMissingSentenceHeaders(["첫 문장", "1번째", "2번째", "3번째"])).toEqual([]);
    expect(findMissingSentenceHeaders(["첫 문장", "1번째"])).toEqual(["2번째", "3번째"]);
    expect(findMissingSentenceHeaders(["1번째", "2번째", "3번째"])).toEqual(["첫 문장"]);
  });
});

describe("annotateSentenceRows", () => {
  it("정상 행은 오류가 없고 문장 수만큼 정리해 돌려준다", () => {
    const [row] = annotateSentenceRows([input()]);
    expect(row.error).toBeUndefined();
    expect(row.sentences).toHaveLength(3);
  });

  it("최대 10문장까지 허용한다", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `Sentence number ${i + 1}.`);
    const [row] = annotateSentenceRows([input({ cells: cells(...ten) })]);
    expect(row.error).toBeUndefined();
    expect(row.sentences).toHaveLength(10);
  });

  it("3문장 미만이면 오류", () => {
    const [row] = annotateSentenceRows([input({ cells: cells("Only one.", "Only two.") })]);
    expect(row.error).toBe("이어지는 문장이 3개 이상이어야 합니다.");
  });

  it("중간에 빈 칸이 있으면 몇 번째인지 알려 준다", () => {
    const [row] = annotateSentenceRows([input({ cells: cells("One.", "", "Three.", "Four.") })]);
    expect(row.error).toBe("2번째가 비어 있습니다. 문장은 빈 칸 없이 이어서 입력하세요.");
  });

  it("첫 문장이 비면 오류", () => {
    const [row] = annotateSentenceRows([input({ intro: "  " })]);
    expect(row.error).toBe("첫 문장이(가) 비어 있습니다.");
  });

  it("같은 문장이 있으면 오류(대소문자·공백 차이는 같은 것으로 본다)", () => {
    const [row] = annotateSentenceRows([
      input({ cells: cells("Hello there.", "  hello   THERE. ", "Third.") }),
    ]);
    expect(row.error).toBe("같은 문장이 두 번 이상 들어 있습니다.");
    const [withIntro] = annotateSentenceRows([
      input({ cells: cells("You already have a business.", "Second.", "Third.") }),
    ]);
    expect(withIntro.error).toBe("같은 문장이 두 번 이상 들어 있습니다.");
  });

  it("같은 첫 문장은 한 번만", () => {
    const rows = annotateSentenceRows([input({ row: 2 }), input({ row: 3 })]);
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toBe("2행과 같은 첫 문장입니다.");
    expect(countSentenceErrors(rows)).toBe(1);
  });
});
