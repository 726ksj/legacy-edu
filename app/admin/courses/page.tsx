import { createAdminClient } from "@/lib/supabase/admin";
import CourseForm from "./CourseForm";
import CourseTable from "./CourseTable";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const supabase = createAdminClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      "id, subject, title, teacher_name, school, level, price, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: instructors } = await supabase
    .from("instructors")
    .select("id, name, subject")
    .order("name", { ascending: true });

  const { data: editingCourse } = edit
    ? await supabase
        .from("courses")
        .select(
          "id, subject, title, instructor_id, school, overview, level, tagline, is_best, duration_days, price",
        )
        .eq("id", edit)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">강좌 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        개설 강좌 정보를 등록/수정하는 페이지입니다.
      </p>

      <div className="mt-6">
        <CourseForm
          key={editingCourse?.id ?? "new"}
          instructors={instructors ?? []}
          editingCourse={editingCourse}
        />
      </div>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6">
        <CourseTable
          courses={courses ?? []}
          editingCourseId={editingCourse?.id}
        />
      </div>
    </div>
  );
}
