import { describe, expect, it } from "vitest";
import {
  annotateOrderRows,
  countOrderErrors,
  findMissingOrderHeaders,
  type OrderRowInput,
} from "./orderUpload";

const input = (overrides: Partial<OrderRowInput> = {}): OrderRowInput => ({
  row: 2,
  intro: "Smartphones have changed how we live.",
  part1: "At first, people used them only for calls.",
  part2: "Soon, apps made them useful for almost everything.",
  part3: "Today, many of us cannot imagine a day without one.",
  ...overrides,
});

describe("findMissingOrderHeaders", () => {
  it("네 열이 모두 필요하다", () => {
    expect(findMissingOrderHeaders(["첫 문장", "1번째", "2번째", "3번째"])).toEqual([]);
    expect(findMissingOrderHeaders(["첫 문장", "1번째"])).toEqual(["2번째", "3번째"]);
  });

  it("열 제목 앞뒤 공백은 무시한다", () => {
    expect(findMissingOrderHeaders([" 첫 문장 ", "1번째", "2번째", "3번째 "])).toEqual([]);
  });
});

describe("annotateOrderRows", () => {
  it("정상 행은 오류가 없고 공백을 정리한다", () => {
    const [row] = annotateOrderRows([input({ intro: "  Hello   world.  " })]);
    expect(row.error).toBeUndefined();
    expect(row.intro).toBe("Hello world.");
  });

  it("비어 있는 칸을 모두 알려 준다", () => {
    const [row] = annotateOrderRows([input({ part1: "", part3: "  " })]);
    expect(row.error).toBe("1번째, 3번째이(가) 비어 있습니다.");
  });

  it("세 덩어리가 같으면 오류(대소문자와 공백 차이는 같은 것으로 본다)", () => {
    const [row] = annotateOrderRows([input({ part2: " at first, people used them only for calls. " })]);
    expect(row.error).toBe("1번째·2번째·3번째 내용이 서로 달라야 합니다.");
  });

  it("같은 첫 문장은 한 번만", () => {
    const rows = annotateOrderRows([input({ row: 2 }), input({ row: 3 })]);
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toBe("2행과 같은 첫 문장입니다.");
    expect(countOrderErrors(rows)).toBe(1);
  });
});
