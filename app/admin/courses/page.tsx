import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import CourseForm from "./CourseForm";
import DeleteCourseButton from "./DeleteCourseButton";
import { deleteCourse } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, subject, title, teacher_name, school, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">강좌 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        개설 강좌 정보를 등록/수정하는 페이지입니다.
      </p>

      <div className="mt-6">
        <CourseForm />
      </div>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">강좌명</th>
              <th className="px-4 py-3">선생님</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">개설일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {courses?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-zinc-700">{row.subject}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.title}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {row.teacher_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.school ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/courses/${row.id}/lessons`}
                      className="text-xs font-semibold text-brand-dark hover:underline"
                    >
                      차시 관리
                    </Link>
                    <DeleteCourseButton
                      action={deleteCourse.bind(null, row.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {courses?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  등록된 강좌가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
