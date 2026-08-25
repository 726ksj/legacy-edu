import { createAdminClient } from "@/lib/supabase/admin";
import CourseListing from "@/components/courses/CourseListing";
import type { CourseListItem } from "@/components/courses/types";

export const dynamic = "force-dynamic";

// 강좌 카탈로그는 로그인 없이 누구나 볼 수 있어야 하지만, courses/lessons
// 테이블의 RLS는 익명 조회를 막아둔 상태다. lessons에는 mux_asset_id 등
// 공개할 필요 없는 컬럼도 있어서 RLS를 여는 대신, 서버에서만 쓰이는
// admin 클라이언트로 카탈로그에 필요한 컬럼만 골라 select한다.
export default async function Page() {
  const supabase = createAdminClient();

  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, subject, teacher_name, title, school, tagline, is_best, duration_days, price",
    )
    .eq("level", "high")
    .order("title", { ascending: true });

  const courseIds = (courses ?? []).map((course) => course.id);

  const { data: lessons } = courseIds.length
    ? await supabase.from("lessons").select("course_id").in("course_id", courseIds)
    : { data: [] as { course_id: string }[] };

  const lectureCountByCourse = new Map<string, number>();
  for (const lesson of lessons ?? []) {
    lectureCountByCourse.set(
      lesson.course_id,
      (lectureCountByCourse.get(lesson.course_id) ?? 0) + 1,
    );
  }

  const items: CourseListItem[] = (courses ?? []).map((course) => ({
    id: course.id,
    subject: course.subject,
    teacherName: course.teacher_name,
    title: course.title,
    school: course.school,
    tagline: course.tagline,
    isBest: course.is_best,
    durationDays: course.duration_days,
    lectureCount: lectureCountByCourse.get(course.id) ?? 0,
    price: course.price,
  }));

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
        고등 강좌
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        재학 중인 학교에 맞는 강좌를 선택해 수강 신청하세요.
      </p>

      <div className="mt-8">
        <CourseListing courses={items} />
      </div>
    </section>
  );
}
