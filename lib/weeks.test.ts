import { describe, expect, it } from "vitest";
import {
  courseEndLabel,
  currentWeek,
  parseWeekField,
  parseWeekParam,
  weekDateRange,
} from "./weeks";

describe("parseWeekParam", () => {
  it("1~8과 none만 허용한다", () => {
    expect(parseWeekParam("3")).toBe(3);
    expect(parseWeekParam("none")).toBeNull();
    expect(parseWeekParam("0")).toBeUndefined();
    expect(parseWeekParam("9")).toBeUndefined();
    expect(parseWeekParam("abc")).toBeUndefined();
  });
});

describe("parseWeekField", () => {
  it("빈 값과 범위 밖 값은 null", () => {
    expect(parseWeekField("")).toBeNull();
    expect(parseWeekField(null)).toBeNull();
    expect(parseWeekField("9")).toBeNull();
    expect(parseWeekField("8")).toBe(8);
  });
});

describe("weekDateRange", () => {
  it("시작일 기준 7일 단위 범위를 만든다", () => {
    expect(weekDateRange("2026-09-07", 1)).toBe("9.7 ~ 9.13");
    expect(weekDateRange("2026-09-07", 3)).toBe("9.21 ~ 9.27");
  });
  it("시작일이 없으면 null", () => {
    expect(weekDateRange(null, 1)).toBeNull();
  });
});

describe("currentWeek", () => {
  const start = "2026-09-07";
  it("시작일 기준 주차를 계산한다(KST)", () => {
    expect(currentWeek(start, new Date("2026-09-07T00:00:00+09:00"))).toBe(1);
    expect(currentWeek(start, new Date("2026-09-13T23:59:00+09:00"))).toBe(1);
    expect(currentWeek(start, new Date("2026-09-14T00:00:00+09:00"))).toBe(2);
  });
  it("시작 전, 종료 후, 시작일 없음은 null", () => {
    expect(currentWeek(start, new Date("2026-09-06T12:00:00+09:00"))).toBeNull();
    expect(currentWeek(start, new Date("2026-11-02T12:00:00+09:00"))).toBeNull();
    expect(currentWeek(null)).toBeNull();
  });
});

describe("courseEndLabel", () => {
  it("시작일 + 8주 - 1일", () => {
    expect(courseEndLabel("2026-09-07")).toBe("2026.11.1");
  });
});
