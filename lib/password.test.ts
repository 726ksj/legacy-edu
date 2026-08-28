import { describe, expect, it } from "vitest";
import { isValidPassword } from "./password";

describe("isValidPassword", () => {
  it("영문+숫자 조합 8자 이상이면 통과", () => {
    expect(isValidPassword("abcd1234")).toBe(true);
    expect(isValidPassword("Passw0rd!")).toBe(true);
  });

  it("8자 미만이면 거부", () => {
    expect(isValidPassword("abc123")).toBe(false);
  });

  it("숫자가 없으면 거부", () => {
    expect(isValidPassword("abcdefgh")).toBe(false);
  });

  it("영문이 없으면 거부", () => {
    expect(isValidPassword("12345678")).toBe(false);
  });

  it("빈 문자열은 거부", () => {
    expect(isValidPassword("")).toBe(false);
  });
});
