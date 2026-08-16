import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLessonStatuses } from "@/lib/mux";
import UploadLessonForm from "./UploadLessonForm";
import LessonRow from "./LessonRow";
import { deleteLesson } from "./actions";
import { updateNote } from "./note-actions";
import NoteCard from "@/components/notes/NoteCard";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  preparing: { label: "처리 중", className: "bg-amber-100 text-amber-700" },
  ready: { label: "재생 가능", className: "bg-brand-light text-brand-dark" },
  errored: { label: "처리 실패", className: "bg-red-100 text-red-600" },
};

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  profiles: { name: string; username: string } | null;
}

interface LessonWithNotes {
  id: string;
  order_no: number;
  title: string;
  notes: NoteRow[];
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
    .select(
      "id, order_no, title, mux_asset_id, status, created_at, description",
    )
    .eq("course_id", courseId)
    .order("order_no", { ascending: true });

  if (lessons?.length) {
    await syncLessonStatuses(supabase, lessons);
  }

  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  let lessonsWithNotes: LessonWithNotes[] = [];

  if (lessonIds.length > 0) {
    const { data: notes } = await supabase
      .from("questions")
      .select("id, content, created_at, lesson_id, profiles(name, username)")
      .in("lesson_id", lessonIds)
      .order("created_at", { ascending: false })
      .returns<NoteRow[]>();

    const notesByLesson = new Map<string, NoteRow[]>();
    for (const note of notes ?? []) {
      const list = notesByLesson.get(note.lesson_id) ?? [];
      list.push(note);
      notesByLesson.set(note.lesson_id, list);
    }

    lessonsWithNotes = (lessons ?? [])
      .map((lesson) => ({
        id: lesson.id,
        order_no: lesson.order_no,
        title: lesson.title,
        notes: notesByLesson.get(lesson.id) ?? [],
      }))
      .filter((lesson) => lesson.notes.length > 0);
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title} — 차시 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 선생님 강좌의 영상을 업로드하고 관리합니다.
      </p>

      <div className="mt-6">
        <UploadLessonForm courseId={courseId} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">순서</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">업로드일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lessons?.map((lesson) => {
              const statusInfo =
                STATUS_LABEL[lesson.status] ?? STATUS_LABEL.preparing;
              return (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  statusInfo={statusInfo}
                  deleteAction={deleteLesson.bind(null, lesson.id, courseId)}
                />
              );
            })}
            {lessons?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  등록된 차시가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 max-w-2xl">
        <h2 className="text-lg font-bold text-zinc-900">학생 메모</h2>
        <div className="mt-3 flex flex-col gap-6">
          {lessonsWithNotes.length === 0 && (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
              학생이 남긴 메모가 없습니다.
            </p>
          )}
          {lessonsWithNotes.map((lesson) => (
            <div key={lesson.id}>
              <p className="text-sm font-semibold text-zinc-700">
                {lesson.order_no}강 · {lesson.title}
              </p>
              <div className="mt-2 flex flex-col gap-3">
                {lesson.notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    content={note.content}
                    updateAction={updateNote.bind(null, note.id, courseId, {})}
                    header={
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-zinc-500">
                          {note.profiles?.name ?? "-"} (
                          {note.profiles?.username ?? "-"})
                        </p>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {new Date(note.created_at).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
