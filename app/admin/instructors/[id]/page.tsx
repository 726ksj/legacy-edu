import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditInstructorForm from "./EditInstructorForm";
import DeleteInstructorButton from "../DeleteInstructorButton";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: instructor } = await supabase
    .from("instructors")
    .select("id, name, subject, photo_url, bio, profile_id")
    .eq("id", id)
    .maybeSingle();

  if (!instructor) {
    notFound();
  }

  const { data: allTeachers } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("role", "teacher")
    .order("name", { ascending: true });

  const { data: linkedInstructors } = await supabase
    .from("instructors")
    .select("profile_id")
    .neq("id", id)
    .not("profile_id", "is", null);

  const linkedElsewhere = new Set(
    (linkedInstructors ?? []).map((row) => row.profile_id),
  );
  const teachers = (allTeachers ?? []).filter(
    (teacher) => !linkedElsewhere.has(teacher.id),
  );

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/instructors"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 강사 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">
        {instructor.name} 강사 정보 수정
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <EditInstructorForm instructor={instructor} teachers={teachers} />

        {instructor.profile_id && (
          <div>
            <Link
              href={`/admin/teacher-accounts/${instructor.profile_id}`}
              className="w-fit text-sm font-semibold text-brand-dark hover:underline"
            >
              연결된 선생님 계정 관리하기 →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          삭제하면 이 강사를 연결한 강좌에서 강사 정보가 사라집니다.
        </p>
        <div className="mt-3">
          <DeleteInstructorButton instructorId={instructor.id} />
        </div>
      </div>
    </div>
  );
}
