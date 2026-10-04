import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import CourseDetailActions from "@/components/courses/CourseDetailActions";

export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  middle: "중등",
  high: "고등",
};

interface Instructor {
  name: string;
  photo_url: string | null;
  bio: string | null;
}

interface Course {
  id: string;
  subject: string;
  title: string;
  school: string | null;
  level: string | null;
  is_best: boolean;
  duration_days: number | null;
  price: number;
  course_scope: string | null;
  content_features: string | null;
  target_audience: string | null;
  instructors: Instructor | null;
}

function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 강좌 카탈로그와 같은 이유로 - courses/lessons 테이블 RLS는 익명
  // 조회를 막아두었으므로(수강생만 조회 가능), 비회원도 볼 수 있어야 하는
  // 상세 페이지는 서버 전용 admin 클라이언트로 조회한다.
  const supabase = createAdminClient();

  const [{ data: course }, { count: lessonCount }] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, subject, title, school, level, is_best, duration_days, price, course_scope, content_features, target_audience, instructors(name, photo_url, bio)",
      )
      .eq("id", id)
      .maybeSingle()
      .returns<Course>(),
    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id),
  ]);

  if (!course) {
    notFound();
  }

  const instructor = course.instructors;
  const levelLabel = course.level ? LEVEL_LABEL[course.level] : null;

  const courseInfoRows = [
    { label: "강좌 범위", content: course.course_scope },
    { label: "내용 및 특징", content: course.content_features },
    { label: "수강 대상", content: course.target_audience },
  ];

  // 과정 미지정 강좌는 드물고, 그런 경우에도 돌아갈 목록은 있어야 하니
  // 고등 목록을 기본값으로 둔다.
  const listHref = `/courses/${course.level === "middle" ? "middle" : "high"}`;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <Link
          href={listHref}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← 강좌 목록
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
          {course.is_best && (
            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
              BEST
            </span>
          )}
          <span className="inline-flex w-fit items-center rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark">
            {course.subject}
          </span>
          {levelLabel && (
            <span className="text-xs font-semibold text-zinc-500">
              {levelLabel}
              {course.school ? ` · ${course.school}` : ""}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {course.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
          {instructor && (
            <span className="font-semibold text-zinc-700">
              {instructor.name} 강사
            </span>
          )}
          {course.duration_days != null && (
            <span>수강기간 {Math.round(course.duration_days / 7)}주</span>
          )}
          <span>강의수 {lessonCount ?? 0}강</span>
        </div>
      </div>

      <div>
        <h2 className="border-b-2 border-brand pb-2 text-lg font-bold text-zinc-900">
          강좌 정보
        </h2>
        <div className="overflow-hidden rounded-b-lg border border-t-0 border-zinc-200 bg-white">
          <dl className="divide-y divide-zinc-100">
            {courseInfoRows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:gap-6"
              >
                <dt className="w-28 shrink-0 text-sm font-semibold text-zinc-500">
                  {row.label}
                </dt>
                {row.content ? (
                  <dd className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {row.content}
                  </dd>
                ) : (
                  <dd className="min-w-0 flex-1 text-sm text-zinc-400">
                    아직 등록된 내용이 없습니다.
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </div>
      </div>

      {instructor && (
        <div>
          <h2 className="text-lg font-bold text-zinc-900">강사 소개</h2>
          <div className="mt-3 flex gap-4 rounded-lg border border-zinc-200 bg-white p-6">
            {instructor.photo_url && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                <Image
                  src={instructor.photo_url}
                  alt={instructor.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <p className="font-semibold text-zinc-900">{instructor.name}</p>
              {instructor.bio && (
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                  {instructor.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-brand/25 bg-brand-light/40 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-zinc-600">
            PC 수강권 가격
          </span>
          <span className="text-2xl font-bold text-zinc-900">
            {formatWon(course.price)}
          </span>
        </div>
        <div className="mt-4">
          <CourseDetailActions courseId={course.id} />
        </div>
      </div>
    </section>
  );
}
