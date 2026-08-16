import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateNote } from "./actions";
import LessonNotesList, { type LessonItem } from "./LessonNotesList";

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  question_read_at: string | null;
  profiles: { name: string; username: string } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title, teacher_name")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, order_no, title, description")
    .eq("course_id", courseId)
    .order("order_no", { ascending: true });

  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);

  const { data: notes } =
    lessonIds.length > 0
      ? await supabase
          .from("questions")
          .select(
            "id, content, created_at, lesson_id, question_read_at, profiles(name, username)",
          )
          .in("lesson_id", lessonIds)
          .order("created_at", { ascending: false })
          .returns<NoteRow[]>()
      : { data: [] as NoteRow[] };

  const unreadIds = (notes ?? [])
    .filter((note) => !note.question_read_at)
    .map((note) => note.id);
  if (unreadIds.length > 0) {
    await supabase
      .from("questions")
      .update({ question_read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  const notesByLesson = new Map<string, NoteRow[]>();
  for (const note of notes ?? []) {
    const list = notesByLesson.get(note.lesson_id) ?? [];
    list.push(note);
    notesByLesson.set(note.lesson_id, list);
  }

  const lessonItems: LessonItem[] = (lessons ?? []).map((lesson) => ({
    id: lesson.id,
    orderNo: lesson.order_no,
    title: lesson.title,
    description: lesson.description,
    notes: (notesByLesson.get(lesson.id) ?? []).map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: new Date(note.created_at).toLocaleString("ko-KR"),
      studentName: note.profiles?.name ?? "-",
      studentUsername: note.profiles?.username ?? "-",
    })),
  }));

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/notes"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 메모 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 선생님 강좌의 차시별 학생 메모입니다. 각
        차시의 「메모 보기」를 눌러 확인할 수 있습니다.
      </p>

      <div className="mt-6 max-w-2xl">
        {lessonItems.length === 0 && (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
            등록된 차시가 없습니다.
          </p>
        )}
        {lessonItems.length > 0 && (
          <LessonNotesList
            lessons={lessonItems}
            updateAction={updateNote.bind(null, courseId)}
          />
        )}
      </div>
    </div>
  );
}
