import { describe, expect, it } from "vitest";
import { parseNumericScore, scoreToPercent } from "./scoreParsing";

describe("parseNumericScore", () => {
  it("정수 점수를 그대로 파싱한다", () => {
    expect(parseNumericScore("92")).toBe(92);
  });

  it("소수점 점수를 파싱한다", () => {
    expect(parseNumericScore("92.5")).toBe(92.5);
  });

  it("앞뒤 공백을 무시한다", () => {
    expect(parseNumericScore("  87  ")).toBe(87);
  });

  it("문자열 중간에 섞인 숫자도 뽑아낸다", () => {
    expect(parseNumericScore("92점")).toBe(92);
  });

  it("등급 텍스트는 null을 반환한다", () => {
    expect(parseNumericScore("A+")).toBe(null);
  });

  it("빈 문자열은 null을 반환한다", () => {
    expect(parseNumericScore("")).toBe(null);
    expect(parseNumericScore("   ")).toBe(null);
  });

  it("음수도 파싱한다", () => {
    expect(parseNumericScore("-5")).toBe(-5);
  });
});

describe("scoreToPercent", () => {
  it("만점 대비 백분율로 변환한다", () => {
    expect(scoreToPercent("30", 100)).toBe(30);
    expect(scoreToPercent("15", 30)).toBe(50);
  });

  it("만점이 0 이하이면 null을 반환한다", () => {
    expect(scoreToPercent("30", 0)).toBe(null);
    expect(scoreToPercent("30", -10)).toBe(null);
  });

  it("점수가 숫자로 해석 안 되면 null을 반환한다", () => {
    expect(scoreToPercent("A+", 100)).toBe(null);
  });

  it("만점을 넘는 점수도 그대로 계산한다 (검증은 호출부 책임)", () => {
    expect(scoreToPercent("120", 100)).toBe(120);
  });
});
