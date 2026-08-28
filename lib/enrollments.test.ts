import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canWatchLesson,
  filterWatchableLessons,
  isEnrolled,
} from "./enrollments";

// enrollments.ts는 실제 Supabase 클라이언트의 .from().select()... 체인을
// 그대로 쓰므로, 같은 모양으로 응답하는 가짜 클라이언트를 만들어 쓴다.
function fakeSupabase(responses: {
  enrollments?: { course_id: string }[];
  lessonAccessList?: { lesson_id: string }[];
  lessonAccessSingle?: { id: string } | null;
}) {
  const client = {
    from(table: string) {
      if (table === "enrollments") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: responses.enrollments?.[0] ?? null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "lesson_access") {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === "profile_id") {
                return {
                  in: async () => ({
                    data: responses.lessonAccessList ?? [],
                  }),
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: responses.lessonAccessSingle ?? null,
                    }),
                  }),
                };
              }
              return {
                eq: () => ({
                  maybeSingle: async () => ({
                    data: responses.lessonAccessSingle ?? null,
                  }),
                }),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };

  // 테스트에 필요한 최소한의 모양만 흉내내는 가짜 클라이언트라 실제
  // SupabaseClient와 구조적으로 겹치지 않는다 - unknown을 거쳐 캐스팅한다.
  return client as unknown as SupabaseClient;
}

describe("isEnrolled", () => {
  it("등록된 강좌면 true", async () => {
    const supabase = fakeSupabase({ enrollments: [{ course_id: "c1" }] });
    expect(await isEnrolled(supabase, "p1", "c1")).toBe(true);
  });

  it("등록 안 됐으면 false", async () => {
    const supabase = fakeSupabase({});
    expect(await isEnrolled(supabase, "p1", "c1")).toBe(false);
  });
});

describe("filterWatchableLessons", () => {
  const lessons = [
    { id: "l-all", visibility: "all" as const },
    { id: "l-include", visibility: "include" as const },
    { id: "l-exclude", visibility: "exclude" as const },
  ];

  it("visibility가 all인 차시는 항상 통과시킨다", async () => {
    const supabase = fakeSupabase({ lessonAccessList: [] });
    const result = await filterWatchableLessons(supabase, "p1", lessons);
    expect(result.map((l) => l.id)).toContain("l-all");
  });

  it("include는 접근 목록에 있어야만 통과, exclude는 목록에 없어야 통과", async () => {
    const supabase = fakeSupabase({
      lessonAccessList: [{ lesson_id: "l-include" }],
    });
    const result = await filterWatchableLessons(supabase, "p1", lessons);
    expect(result.map((l) => l.id).sort()).toEqual(
      ["l-all", "l-exclude", "l-include"].sort(),
    );
  });

  it("include 목록에 없으면 제외한다", async () => {
    const supabase = fakeSupabase({ lessonAccessList: [] });
    const result = await filterWatchableLessons(supabase, "p1", lessons);
    expect(result.map((l) => l.id)).not.toContain("l-include");
  });

  it("exclude 목록에 있으면 제외한다", async () => {
    const supabase = fakeSupabase({
      lessonAccessList: [{ lesson_id: "l-exclude" }],
    });
    const result = await filterWatchableLessons(supabase, "p1", lessons);
    expect(result.map((l) => l.id)).not.toContain("l-exclude");
  });
});

describe("canWatchLesson", () => {
  it("등록 안 된 학생은 무조건 못 본다 (visibility와 무관)", async () => {
    const supabase = fakeSupabase({});
    const canWatch = await canWatchLesson(supabase, "p1", {
      id: "l1",
      course_id: "c1",
      visibility: "all",
    });
    expect(canWatch).toBe(false);
  });

  it("등록됐고 visibility가 all이면 볼 수 있다", async () => {
    const supabase = fakeSupabase({ enrollments: [{ course_id: "c1" }] });
    const canWatch = await canWatchLesson(supabase, "p1", {
      id: "l1",
      course_id: "c1",
      visibility: "all",
    });
    expect(canWatch).toBe(true);
  });

  it("등록됐고 include인데 목록에 없으면 못 본다", async () => {
    const supabase = fakeSupabase({
      enrollments: [{ course_id: "c1" }],
      lessonAccessSingle: null,
    });
    const canWatch = await canWatchLesson(supabase, "p1", {
      id: "l1",
      course_id: "c1",
      visibility: "include",
    });
    expect(canWatch).toBe(false);
  });

  it("등록됐고 exclude인데 목록에 있으면 못 본다", async () => {
    const supabase = fakeSupabase({
      enrollments: [{ course_id: "c1" }],
      lessonAccessSingle: { id: "la1" },
    });
    const canWatch = await canWatchLesson(supabase, "p1", {
      id: "l1",
      course_id: "c1",
      visibility: "exclude",
    });
    expect(canWatch).toBe(false);
  });
});
