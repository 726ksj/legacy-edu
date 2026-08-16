import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { updateNote, deleteNote } from "./actions";
import NoteCard from "@/components/notes/NoteCard";

export const dynamic = "force-dynamic";

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  lessons: {
    order_no: number;
    title: string;
    course_id: string;
    courses: { subject: string; title: string } | null;
  } | null;
}

interface CourseGroup {
  subject: string;
  title: string;
  items: NoteRow[];
}

export default async function MyNotesPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notes } = await supabase
    .from("questions")
    .select(
      "id, content, created_at, lesson_id, lessons(order_no, title, course_id, courses(subject, title))",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .returns<NoteRow[]>();

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

  // 강좌 안에서는 최신순이 아니라 차시 순서(1강, 2강, ...)대로 보여준다.
  for (const group of groups.values()) {
    group.items.sort(
      (a, b) => (a.lessons?.order_no ?? 0) - (b.lessons?.order_no ?? 0),
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">나의 메모</h1>
        <p className="mt-2 text-sm text-zinc-500">
          강의를 들으며 남긴 메모를 강좌별로 모아볼 수 있어요.
        </p>
      </div>

      {(!notes || notes.length === 0) && (
        <p className="text-sm text-zinc-500">아직 남긴 메모가 없습니다.</p>
      )}

      <div className="flex flex-col gap-8">
        {Array.from(groups.entries()).map(([courseId, group]) => (
          <div key={courseId} className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-brand-dark">
              [{group.subject}] {group.title}
            </p>
            <div className="flex flex-col gap-3">
              {group.items.map((note) => (
                <NoteCard
                  key={note.id}
                  content={note.content}
                  updateAction={updateNote.bind(null, note.id, {})}
                  deleteAction={deleteNote.bind(null, note.id)}
                  header={
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/watch/${note.lesson_id}`}
                        className="text-xs font-medium text-zinc-500 hover:text-brand-dark"
                      >
                        {note.lessons?.title}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {new Date(note.created_at).toLocaleDateString(
                          "ko-KR",
                        )}
                      </span>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
