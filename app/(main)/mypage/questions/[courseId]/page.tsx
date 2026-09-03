import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import { requireCourseGradeManager } from "@/lib/teachers";
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

export default async function QuestionsCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  let viewer;
  try {
    viewer = await requireCourseGradeManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title")
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

  // 담당 강좌의 질문을 열람하면, 관리자/다른 스태프가 보는 NEW 뱃지
  // 기준인 question_read_at도 admin/notes와 동일하게 갱신한다 - 어느
  // 스태프가 먼저 봤든 "확인된 질문"으로 취급한다.
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
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <Link
          href="/mypage/questions"
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← 질문 관리
        </Link>
        <p className="text-xs font-semibold text-brand-dark">
          {course.subject}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {course.title}
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          차시별로 학생이 남긴 질문을 확인하고 답변할 수 있습니다.
        </p>
      </div>

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
    </section>
  );
}
