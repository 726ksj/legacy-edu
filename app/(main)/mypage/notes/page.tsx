import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { updateNote, deleteNote, replyToOwnQuestion } from "./actions";
import { buildThreads } from "@/lib/questionThreads";
import QuestionThread, {
  type ThreadMessageView,
} from "@/components/notes/QuestionThread";

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
  lessons: {
    order_no: number;
    title: string;
    course_id: string;
    courses: { subject: string; title: string } | null;
  } | null;
}

interface ThreadView {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lessonOrderNo: number;
  createdAt: string;
  messages: ThreadMessageView[];
}

interface CourseGroup {
  subject: string;
  title: string;
  threads: ThreadView[];
}

export default async function MyNotesPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  // RLS(questions_select_own_thread)가 "본인이 쓴 질문 + 그 질문에 달린
  // 답글(스태프 포함)"만 걸러서 내려주므로, profile_id로 다시 필터링할
  // 필요가 없다 - 그러면 스태프가 쓴 답글까지 함께 빠진다.
  const { data: rows } = await supabase
    .from("questions")
    .select(
      "id, parent_id, content, created_at, lesson_id, profile_id, question_read_at, answer_read_at, lessons(order_no, title, course_id, courses(subject, title))",
    )
    .order("created_at", { ascending: true })
    .returns<QuestionRow[]>();

  const threads = buildThreads(rows ?? []);
  const rootById = new Map((rows ?? []).map((row) => [row.id, row]));

  // 스태프 답변을 확인했으니 헤더의 "나의 질문" 뱃지가 다시 안 뜨도록
  // 읽음 처리한다.
  const unreadFromStaffIds = (rows ?? [])
    .filter((row) => {
      const thread = threads.find((t) => t.id === (row.parent_id ?? row.id));
      return (
        thread &&
        row.profile_id !== thread.studentProfileId &&
        !row.answer_read_at
      );
    })
    .map((row) => row.id);
  if (unreadFromStaffIds.length > 0) {
    await supabase
      .from("questions")
      .update({ answer_read_at: new Date().toISOString() })
      .in("id", unreadFromStaffIds);
  }

  const groups = new Map<string, CourseGroup>();
  for (const thread of threads) {
    const root = rootById.get(thread.id);
    const lesson = root?.lessons;
    const course = lesson?.courses;
    const key = lesson?.course_id ?? "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        subject: course?.subject ?? "",
        title: course?.title ?? "알 수 없는 강좌",
        threads: [],
      });
    }
    groups.get(key)!.threads.push({
      id: thread.id,
      lessonId: thread.lessonId,
      lessonTitle: lesson?.title ?? "-",
      lessonOrderNo: lesson?.order_no ?? 0,
      createdAt: new Date(
        thread.messages[0].createdAt,
      ).toLocaleDateString("ko-KR"),
      messages: thread.messages.map((message) => ({
        id: message.id,
        authorLabel: message.profileId === user.id ? "나" : "답변",
        isFromStudent: message.profileId === thread.studentProfileId,
        content: message.content,
        createdAt: new Date(message.createdAt).toLocaleDateString("ko-KR"),
      })),
    });
  }

  // 강좌 안에서는 최신순이 아니라 차시 순서(1강, 2강, ...)대로 보여준다.
  for (const group of groups.values()) {
    group.threads.sort((a, b) => a.lessonOrderNo - b.lessonOrderNo);
  }

  const hasAnyThread = threads.length > 0;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Questions
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          나의 질문
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          강의를 들으며 남긴 질문을 강좌별로 모아볼 수 있어요.
        </p>
      </div>

      {!hasAnyThread && (
        <p className="text-sm text-zinc-500">아직 남긴 질문이 없습니다.</p>
      )}

      <div className="flex flex-col gap-8">
        {Array.from(groups.entries()).map(([courseId, group]) => (
          <div key={courseId} className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-brand-dark">
              [{group.subject}] {group.title}
            </p>
            <div className="flex flex-col gap-3">
              {group.threads.map((thread) => (
                <div key={thread.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <Link
                      href={`/watch/${thread.lessonId}`}
                      className="text-xs font-medium text-zinc-500 hover:text-brand-dark"
                    >
                      {thread.lessonTitle}
                    </Link>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {thread.createdAt}
                    </span>
                  </div>
                  <QuestionThread
                    messages={thread.messages}
                    updateRootAction={updateNote.bind(null, thread.id, {})}
                    deleteRootAction={deleteNote.bind(null, thread.id)}
                    replyAction={replyToOwnQuestion.bind(null, thread.id)}
                    replyPlaceholder="답변에 이어서 궁금한 점을 남겨보세요."
                    replyButtonLabel="질문 등록"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
