import { describe, expect, it } from "vitest";
import { formatPhone } from "./formatPhone";

describe("formatPhone", () => {
  it("11자리 휴대폰 번호를 하이픈으로 나눈다", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
  });

  it("이미 하이픈이 있어도 정규화해서 다시 포맷한다", () => {
    expect(formatPhone("010-1234-5678")).toBe("010-1234-5678");
  });

  it("서울 지역번호(02)는 2-4-4로 나눈다", () => {
    expect(formatPhone("0212345678")).toBe("02-1234-5678");
  });

  it("02로 시작하지 않는 10자리는 3-3-4로 나눈다", () => {
    expect(formatPhone("0311234567")).toBe("031-123-4567");
  });

  it("null/undefined/빈 문자열은 빈 문자열을 반환한다", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone(undefined)).toBe("");
    expect(formatPhone("")).toBe("");
  });

  it("알 수 없는 자릿수는 원본을 그대로 반환한다", () => {
    expect(formatPhone("123")).toBe("123");
  });
});
