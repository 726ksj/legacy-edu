import { describe, expect, it } from "vitest";
import {
  slugify,
  parseExtraFieldLabels,
  digitsOnly,
  normalizePhoneDigits,
  cellToString,
} from "./scoreUpload";

describe("slugify", () => {
  it("영문/숫자는 소문자 스네이크 케이스로 남기고 랜덤 접미사를 붙인다", () => {
    const slug = slugify("Mock Exam 2026");
    expect(slug).toMatch(/^mock_exam_2026_[a-f0-9]{8}$/);
  });

  it("한글뿐이라 base가 비면 category_ 접두사를 쓴다", () => {
    const slug = slugify("모의고사");
    expect(slug).toMatch(/^category_[a-f0-9]{8}$/);
  });

  it("호출할 때마다 다른 슬러그를 만든다 (충돌 방지)", () => {
    expect(slugify("단어 테스트")).not.toBe(slugify("단어 테스트"));
  });
});

describe("parseExtraFieldLabels", () => {
  it("콤마로 구분해서 앞뒤 공백을 제거한다", () => {
    expect(parseExtraFieldLabels("백분위, 등급")).toEqual(["백분위", "등급"]);
  });

  it("빈 값과 중복을 제거한다", () => {
    expect(parseExtraFieldLabels("백분위,, 백분위, 등급,")).toEqual([
      "백분위",
      "등급",
    ]);
  });

  it("빈 입력은 빈 배열을 반환한다", () => {
    expect(parseExtraFieldLabels("")).toEqual([]);
    expect(parseExtraFieldLabels("   ")).toEqual([]);
  });
});

describe("digitsOnly / normalizePhoneDigits", () => {
  it("숫자 이외 문자를 전부 제거한다", () => {
    expect(digitsOnly("010-1234-5678")).toBe("01012345678");
  });

  it("11자리는 그대로 둔다", () => {
    expect(normalizePhoneDigits("010-1234-5678")).toBe("01012345678");
  });

  it("엑셀이 숫자로 읽어 앞자리 0이 날아간 10자리를 0으로 복원한다", () => {
    expect(normalizePhoneDigits("1012345678")).toBe("01012345678");
  });

  it("이미 0으로 시작하는 10자리는 건드리지 않는다 (지역번호 등)", () => {
    expect(normalizePhoneDigits("0212345678")).toBe("0212345678");
  });

  it("서로 다른 표기의 같은 번호가 동일하게 정규화된다", () => {
    expect(normalizePhoneDigits("01012345678")).toBe(
      normalizePhoneDigits("1012345678"),
    );
  });
});

describe("cellToString", () => {
  it("null/undefined는 빈 문자열", () => {
    expect(cellToString(null)).toBe("");
    expect(cellToString(undefined)).toBe("");
  });

  it("숫자/문자열 셀은 문자열로 변환하고 trim한다", () => {
    expect(cellToString(92)).toBe("92");
    expect(cellToString("  이름  ")).toBe("이름");
  });

  it("Date 셀은 YYYY-MM-DD로 변환한다", () => {
    expect(cellToString(new Date("2026-08-28T00:00:00.000Z"))).toBe(
      "2026-08-28",
    );
  });

  it("richText 셀은 조각을 이어붙인다", () => {
    expect(
      cellToString({
        richText: [{ text: "안녕 " }, { text: "하세요" }],
      } as never),
    ).toBe("안녕 하세요");
  });

  it("수식 셀은 result 값을 재귀적으로 문자열화한다", () => {
    expect(cellToString({ formula: "=A1", result: 92 } as never)).toBe("92");
  });

  it("하이퍼링크 셀은 text 값을 쓴다", () => {
    expect(
      cellToString({ text: "링크텍스트", hyperlink: "https://x" } as never),
    ).toBe("링크텍스트");
  });
});
