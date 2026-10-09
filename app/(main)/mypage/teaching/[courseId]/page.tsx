import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import {
  weeksOf,
  courseEndLabel,
  courseStartLabel,
  currentWeek,
  weekDateRange,
} from "@/lib/weeks";
import LessonsSection from "@/components/teaching/LessonsSection";
import CourseNoticeForm from "./CourseNoticeForm";
import CourseNoticeRow from "./CourseNoticeRow";
import { updateCourseNotice, deleteCourseNotice } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  // 관리자 또는 이 강좌에 배정된 강사만 들어올 수 있다. Server Action이
  // 아니라 페이지 자체 접근이라, 여기서도 별도로 확인해야 한다.
  try {
    await requireCourseManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title, teacher_name, start_date, total_weeks")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const [
    { data: lessonRows },
    { data: vocabRows },
    { data: courseNotices },
    { count: studentCount },
  ] = await Promise.all([
    supabase.from("lessons").select("week").eq("course_id", courseId),
    supabase
      .from("vocab_assignments")
      .select("vocab_sets(week)")
      .eq("course_id", courseId)
      .returns<{ vocab_sets: { week: number | null } | null }[]>(),
    supabase
      .from("course_notices")
      .select("id, title, content, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId),
  ]);

  // 주차(null = 미지정)별 영상/단어장 개수.
  const lessonCount = new Map<number | null, number>();
  for (const row of lessonRows ?? []) {
    const key = row.week ?? null;
    lessonCount.set(key, (lessonCount.get(key) ?? 0) + 1);
  }
  const vocabCount = new Map<number | null, number>();
  for (const row of vocabRows ?? []) {
    if (!row.vocab_sets) continue;
    const key = row.vocab_sets.week ?? null;
    vocabCount.set(key, (vocabCount.get(key) ?? 0) + 1);
  }
  const unassignedTotal =
    (lessonCount.get(null) ?? 0) + (vocabCount.get(null) ?? 0);

  const totalLessons = lessonRows?.length ?? 0;
  const totalVocabSets = vocabRows?.filter((row) => row.vocab_sets).length ?? 0;
  // null이면 주차 구성을 쓰지 않는 강좌: 영상 목록 + 공지만 보여 준다.
  const totalWeeks = course.total_weeks as number | null;
  const weeks = weeksOf(totalWeeks);
  const thisWeek = totalWeeks ? currentWeek(course.start_date, totalWeeks) : null;
  const startLabel = courseStartLabel(course.start_date);
  const endLabel = totalWeeks
    ? courseEndLabel(course.start_date, totalWeeks)
    : null;
  // 영상과 단어장이 모두 등록된 주차를 "준비 완료"로 본다.
  const readyWeeks = weeks.filter(
    (week) => (lessonCount.get(week) ?? 0) > 0 && (vocabCount.get(week) ?? 0) > 0,
  ).length;

  const stats = [
    { label: "수강생", value: studentCount ?? 0, unit: "명" },
    { label: "전체 영상", value: totalLessons, unit: "개" },
    ...(totalWeeks
      ? [{ label: "전체 단어장", value: totalVocabSets, unit: "개" }]
      : []),
    { label: "강좌 공지", value: courseNotices?.length ?? 0, unit: "개" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <div>
        <Link
          href="/mypage/teaching"
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← 내 강좌 관리
        </Link>
        <div className="mt-3 flex flex-col gap-1">
          <span className="text-xs font-semibold text-brand-dark">
            {course.subject} · {course.teacher_name} 강사
          </span>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            {course.title}
          </h1>
          <p className="text-sm text-zinc-500">
            {!totalWeeks
              ? "주차 구성을 사용하지 않는 강좌입니다."
              : startLabel && endLabel
                ? `${startLabel} ~ ${endLabel} (${totalWeeks}주 커리큘럼)`
                : `${totalWeeks}주 커리큘럼 · 강좌 시작일이 등록되면 기간이 표시됩니다.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-xs font-semibold text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">
              {stat.value}
              <span className="ml-1 text-sm font-medium text-zinc-400">
                {stat.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {!totalWeeks && (
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900">영상 관리</h2>
            <LessonsSection courseId={courseId} week="all" totalWeeks={null} />
          </section>
        )}
        {totalWeeks && (
        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">주차별 학습</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                영상과 단어장이 모두 등록되면 준비 완료로 표시됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(readyWeeks / totalWeeks) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-zinc-600">
                {readyWeeks}/{totalWeeks}주 준비
              </span>
            </div>
          </div>

          {unassignedTotal > 0 && (
            <Link
              href={`/mypage/teaching/${courseId}/week/none`}
              className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm hover:bg-amber-100"
            >
              <span className="font-semibold text-amber-800">
                주차가 지정되지 않은 자료가 있습니다 · 영상{" "}
                {lessonCount.get(null) ?? 0} · 단어장 {vocabCount.get(null) ?? 0}
              </span>
              <span className="shrink-0 text-amber-700">지정하기 →</span>
            </Link>
          )}

          <ul className="grid md:grid-cols-2 md:[&>li]:border-b md:[&>li]:border-zinc-100 md:[&>li:nth-child(odd)]:border-r">
            {weeks.map((week) => {
              const range = weekDateRange(course.start_date, week);
              const lessons = lessonCount.get(week) ?? 0;
              const vocabs = vocabCount.get(week) ?? 0;
              const isCurrent = thisWeek === week;
              const isPast = thisWeek !== null && week < thisWeek;
              return (
                <li key={week}>
                  <Link
                    href={`/mypage/teaching/${courseId}/week/${week}`}
                    className={
                      "flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 " +
                      (isCurrent ? "bg-brand-light/40" : "")
                    }
                  >
                    <span
                      className={
                        "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center " +
                        (isCurrent
                          ? "bg-brand text-white"
                          : isPast
                            ? "bg-zinc-100 text-zinc-400"
                            : "bg-zinc-100 text-zinc-700")
                      }
                    >
                      <span className="text-base font-bold leading-none">
                        {week}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium leading-none">
                        주차
                      </span>
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900">
                          {week}주차
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                            이번 주
                          </span>
                        )}
                        {range && (
                          <span className="text-xs text-zinc-400">{range}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                        <span
                          className={
                            "rounded-md px-2 py-0.5 font-medium " +
                            (lessons > 0
                              ? "bg-brand-light text-brand-dark"
                              : "bg-zinc-100 text-zinc-400")
                          }
                        >
                          영상 {lessons}
                        </span>
                        <span
                          className={
                            "rounded-md px-2 py-0.5 font-medium " +
                            (vocabs > 0
                              ? "bg-brand-light text-brand-dark"
                              : "bg-zinc-100 text-zinc-400")
                          }
                        >
                          단어장 {vocabs}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 text-sm text-zinc-300">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">공지사항 관리</h2>
            <p className="mt-1 text-sm text-zinc-500">
              이 강좌를 수강 중인 학생들의 &quot;나의 강의실&quot; 화면에만
              보이는 공지입니다.
            </p>
          </div>

          <CourseNoticeForm courseId={courseId} />

          <div className="flex flex-col gap-3">
            {courseNotices?.map((notice) => (
              <CourseNoticeRow
                key={notice.id}
                notice={notice}
                onUpdate={updateCourseNotice.bind(null, notice.id, courseId)}
                onDelete={deleteCourseNotice.bind(null, notice.id, courseId)}
              />
            ))}
            {courseNotices?.length === 0 && (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
                등록된 강좌 공지가 없습니다.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
