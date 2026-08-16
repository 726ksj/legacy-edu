import { createAdminClient } from "@/lib/supabase/admin";
import EnrollmentForm from "./EnrollmentForm";
import DeleteEnrollmentButton from "./DeleteEnrollmentButton";
import { deleteEnrollment } from "./actions";

interface EnrollmentRow {
  id: string;
  course_id: string;
  enrolled_at: string;
  profiles: { name: string; username: string } | null;
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
    .select("id, course_id, enrolled_at, profiles(name, username)")
    .order("enrolled_at", { ascending: false })
    .returns<EnrollmentRow[]>();

  const enrollmentsByCourse = new Map<string, EnrollmentRow[]>();
  for (const row of enrollments ?? []) {
    const list = enrollmentsByCourse.get(row.course_id) ?? [];
    list.push(row);
    enrollmentsByCourse.set(row.course_id, list);
  }

  return (
    <div className="flex flex-1 flex-col p-8">
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

      <div className="mt-6 flex flex-col gap-6">
        {courses?.map((course) => {
          const rows = enrollmentsByCourse.get(course.id) ?? [];

          return (
            <div
              key={course.id}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-900">
                  [{course.subject}] {course.title}
                </p>
                <span className="text-xs text-zinc-400">{rows.length}명</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold text-zinc-500">
                  <tr>
                    <th className="px-4 py-2">학생</th>
                    <th className="px-4 py-2">아이디</th>
                    <th className="px-4 py-2">등록일</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2 text-zinc-700">
                        {row.profiles?.name ?? "-"}
                      </td>
                      <td className="px-4 py-2 font-mono text-zinc-500">
                        {row.profiles?.username ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-zinc-500">
                        {new Date(row.enrolled_at).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <DeleteEnrollmentButton
                          action={deleteEnrollment.bind(null, row.id)}
                        />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-zinc-400"
                      >
                        등록된 학생이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
        {courses?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 강좌가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
