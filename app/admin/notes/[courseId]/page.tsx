import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/formatDateTime";
import { buildThreads, countUnreadFromStudent } from "@/lib/questionThreads";
import { updateNote, answerQuestion, deleteAnswer } from "./actions";
import LessonQuestionsList, {
  type LessonItem,
} from "@/components/notes/LessonQuestionsList";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  lesson_id: string;
  profile_id: string;
  question_read_at: string | null;
  answer_read_at: string | null;
  profiles: { name: string; username: string } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();
  const viewer = await getAuthUser();

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

  const { data: rows } =
    lessonIds.length > 0
      ? await supabase
          .from("questions")
          .select(
            "id, parent_id, content, created_at, lesson_id, profile_id, question_read_at, answer_read_at, profiles(name, username)",
          )
          .in("lesson_id", lessonIds)
          .order("created_at", { ascending: true })
          .returns<QuestionRow[]>()
      : { data: [] as QuestionRow[] };

  const threads = buildThreads(rows ?? []);

  // 학생이 쓴 메시지(최초 질문 + 후속 질문) 중 아직 안 읽은 게 있으면
  // 여기서 읽음 처리한다.
  const unreadIds = (rows ?? [])
    .filter((row) => {
      const thread = threads.find((t) => t.id === (row.parent_id ?? row.id));
      return (
        thread &&
        row.profile_id === thread.studentProfileId &&
        !row.question_read_at
      );
    })
    .map((row) => row.id);
  if (unreadIds.length > 0) {
    await supabase
      .from("questions")
      .update({ question_read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  const profileById = new Map(
    (rows ?? []).map((row) => [row.profile_id, row.profiles]),
  );

  const threadsByLesson = new Map<string, typeof threads>();
  for (const thread of threads) {
    const list = threadsByLesson.get(thread.lessonId) ?? [];
    list.push(thread);
    threadsByLesson.set(thread.lessonId, list);
  }

  const lessonItems: LessonItem[] = (lessons ?? []).map((lesson) => ({
    id: lesson.id,
    orderNo: lesson.order_no,
    title: lesson.title,
    description: lesson.description,
    threads: (threadsByLesson.get(lesson.id) ?? []).map((thread) => {
      const studentProfile = profileById.get(thread.studentProfileId);
      return {
        id: thread.id,
        studentName: studentProfile?.name ?? "-",
        studentUsername: studentProfile?.username ?? "-",
        unreadFromStudent: countUnreadFromStudent(thread),
        messages: thread.messages.map((message, index) => {
          const isRoot = index === 0;
          // 최초 질문은 내용 수정(모더레이션)만 가능하고, 본인이 쓴
          // 답변은 수정·삭제 둘 다 가능하다. 다른 스태프가 쓴 답변은
          // 손댈 수 없다.
          const isOwnAnswer = !isRoot && message.profileId === viewer?.id;
          return {
            id: message.id,
            authorLabel: profileById.get(message.profileId)?.name ?? "-",
            isFromStudent: message.profileId === thread.studentProfileId,
            content: message.content,
            createdAt: formatDateTime(message.createdAt),
            canEdit: isRoot || isOwnAnswer,
            canDelete: isOwnAnswer,
          };
        }),
      };
    }),
  }));

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/notes"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 질의응답 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 선생님 강좌의 차시별 학생 질문입니다. 각
        차시의 「질문 보기」를 눌러 확인할 수 있습니다.
      </p>

      <div className="mt-6 max-w-2xl">
        {lessonItems.length === 0 && (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
            등록된 차시가 없습니다.
          </p>
        )}
        {lessonItems.length > 0 && (
          <LessonQuestionsList
            lessons={lessonItems}
            updateAction={updateNote.bind(null, courseId)}
            deleteAction={deleteAnswer.bind(null, courseId)}
            replyAction={answerQuestion.bind(null, courseId)}
          />
        )}
      </div>
    </div>
  );
}
