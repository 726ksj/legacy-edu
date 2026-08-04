import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditCourseForm from "./EditCourseForm";
import DeleteCourseButton from "../DeleteCourseButton";
import { deleteCourseAndRedirect } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, subject, title, instructor_id, school, thumbnail_url, overview",
    )
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: instructors } = await supabase
    .from("instructors")
    .select("id, name, subject")
    .order("name", { ascending: true });

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/courses"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 강좌 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">{course.title} 수정</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생용 강좌 상세 화면(나의 강의실)에 표시되는 개요, 대표 이미지,
        강사를 관리합니다.
      </p>

      <div className="mt-6 max-w-2xl">
        <EditCourseForm course={course} instructors={instructors ?? []} />
      </div>

      <div className="mt-6 max-w-2xl">
        <Link
          href={`/admin/courses/${course.id}/lessons`}
          className="text-sm font-semibold text-brand-dark hover:underline"
        >
          차시 관리로 이동 →
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          삭제하면 강좌에 속한 모든 차시(영상)와 수강 등록 정보도 함께
          삭제됩니다.
        </p>
        <div className="mt-3">
          <DeleteCourseButton
            action={deleteCourseAndRedirect.bind(null, course.id)}
          />
        </div>
      </div>
    </div>
  );
}
