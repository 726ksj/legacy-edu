import { createAdminClient } from "@/lib/supabase/admin";
import EnrollmentForm from "./EnrollmentForm";
import DeleteEnrollmentButton from "./DeleteEnrollmentButton";
import { deleteEnrollment } from "./actions";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  id: string;
  enrolled_at: string;
  profiles: { name: string; username: string } | null;
  courses: { subject: string; title: string } | null;
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, subject, title")
    .order("created_at", { ascending: false });

  const { data: students } = await supabase
    .from("profiles")
    .select("id, name, username")
    .order("name", { ascending: true });

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, profiles(name, username), courses(subject, title)")
    .order("enrolled_at", { ascending: false })
    .returns<EnrollmentRow[]>();

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/enrollments
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">수강 권한 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생을 강좌에 등록하거나 수강 권한을 해지하는 페이지입니다.
      </p>

      <div className="mt-6">
        <EnrollmentForm courses={courses ?? []} students={students ?? []} />
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
              <th className="px-4 py-3">학생</th>
              <th className="px-4 py-3">아이디</th>
              <th className="px-4 py-3">강좌</th>
              <th className="px-4 py-3">등록일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {enrollments?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-zinc-700">
                  {row.profiles?.name ?? "-"}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-500">
                  {row.profiles?.username ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-900">
                  {row.courses
                    ? `[${row.courses.subject}] ${row.courses.title}`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.enrolled_at).toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteEnrollmentButton
                    action={deleteEnrollment.bind(null, row.id)}
                  />
                </td>
              </tr>
            ))}
            {enrollments?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  등록된 수강 권한이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
