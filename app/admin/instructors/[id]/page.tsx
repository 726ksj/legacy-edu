import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditInstructorForm from "./EditInstructorForm";
import DeleteInstructorButton from "../DeleteInstructorButton";
import { deleteInstructorAndRedirect } from "../actions";

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
    .select("id, name, photo_url, bio")
    .eq("id", id)
    .maybeSingle();

  if (!instructor) {
    notFound();
  }

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

      <div className="mt-6 max-w-lg">
        <EditInstructorForm instructor={instructor} />
      </div>

      <div className="mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          삭제하면 이 강사를 연결한 강좌에서 강사 정보가 사라집니다.
        </p>
        <div className="mt-3">
          <DeleteInstructorButton
            action={deleteInstructorAndRedirect.bind(null, instructor.id)}
          />
        </div>
      </div>
    </div>
  );
}
