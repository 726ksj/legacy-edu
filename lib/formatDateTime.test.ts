import { describe, expect, it } from "vitest";
import { formatDateTime } from "./formatDateTime";

describe("formatDateTime", () => {
  it("오전/오후 대신 24시간제로 표기한다", () => {
    const result = formatDateTime("2026-08-28T11:45:43.000Z"); // UTC 20:45 KST
    expect(result).not.toMatch(/오전|오후|AM|PM/);
  });

  it("자정 시각도 24시간제로 표기한다 (00:xx, 12가 아님)", () => {
    // 2026-08-28T00:00:00 KST == 2026-08-27T15:00:00Z
    const result = formatDateTime("2026-08-27T15:00:00.000Z");
    expect(result).toContain("00:00:00");
  });

  it("문자열과 Date 객체 입력 모두 지원한다", () => {
    const iso = "2026-01-01T00:00:00.000Z";
    expect(formatDateTime(iso)).toBe(formatDateTime(new Date(iso)));
  });
});
