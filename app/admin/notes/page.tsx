import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface NoteRow {
  id: string;
  content: string;
  question_read_at: string | null;
  created_at: string;
  lessons: {
    order_no: number;
    title: string;
    course_id: string;
    courses: { subject: string; title: string } | null;
  } | null;
  profiles: { name: string; username: string } | null;
}

interface CourseGroup {
  subject: string;
  title: string;
  items: NoteRow[];
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: notes, error } = await supabase
    .from("questions")
    .select(
      "id, content, question_read_at, created_at, lessons(order_no, title, course_id, courses(subject, title)), profiles(name, username)",
    )
    .order("created_at", { ascending: false })
    .returns<NoteRow[]>();

  const unreadIds = (notes ?? [])
    .filter((n) => !n.question_read_at)
    .map((n) => n.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("questions")
      .update({ question_read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  const groups = new Map<string, CourseGroup>();
  for (const note of notes ?? []) {
    const course = note.lessons?.courses;
    const key = note.lessons?.course_id ?? "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        subject: course?.subject ?? "",
        title: course?.title ?? "알 수 없는 강좌",
        items: [],
      });
    }
    groups.get(key)!.items.push(note);
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">학생 메모 보기</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생이 강좌별로 남긴 메모를 확인할 수 있는 페이지입니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {Array.from(groups.entries()).map(([courseId, group]) => (
          <div
            key={courseId}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">
                [{group.subject}] {group.title}
              </p>
              <span className="text-xs text-zinc-400">
                {group.items.length}건
              </span>
            </div>
            <div className="flex flex-col divide-y divide-zinc-100">
              {group.items.map((note) => (
                <div key={note.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-zinc-500">
                      {note.lessons?.title}{" "}
                      · {note.profiles?.name ?? "-"} (
                      {note.profiles?.username ?? "-"})
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {new Date(note.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!notes || notes.length === 0) && (
          <p className="text-sm text-zinc-400">등록된 메모가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
