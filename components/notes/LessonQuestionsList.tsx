"use client";

import { useState } from "react";
import QuestionThread, { type ThreadMessageView } from "@/components/notes/QuestionThread";

export interface QuestionThreadItem {
  id: string;
  studentName: string;
  studentUsername: string;
  messages: ThreadMessageView[];
  unreadFromStudent: number;
}

export interface LessonItem {
  id: string;
  orderNo: number;
  title: string;
  description: string | null;
  threads: QuestionThreadItem[];
}

interface ActionResult {
  error?: string;
  success?: boolean;
}

export default function LessonQuestionsList({
  lessons,
  updateAction,
  deleteAction,
  replyAction,
}: {
  lessons: LessonItem[];
  updateAction: (id: string, formData: FormData) => Promise<ActionResult>;
  deleteAction: (id: string) => Promise<void>;
  replyAction: (
    rootId: string,
    formData: FormData,
  ) => Promise<ActionResult>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {lessons.map((lesson) => (
        <LessonQuestionsRow
          key={lesson.id}
          lesson={lesson}
          updateAction={updateAction}
          deleteAction={deleteAction}
          replyAction={replyAction}
        />
      ))}
    </div>
  );
}

function LessonQuestionsRow({
  lesson,
  updateAction,
  deleteAction,
  replyAction,
}: {
  lesson: LessonItem;
  updateAction: (id: string, formData: FormData) => Promise<ActionResult>;
  deleteAction: (id: string) => Promise<void>;
  replyAction: (
    rootId: string,
    formData: FormData,
  ) => Promise<ActionResult>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = lesson.threads.reduce(
    (sum, thread) => sum + thread.unreadFromStudent,
    0,
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            {lesson.title}
            {unreadCount > 0 && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                title={`안 읽은 질문 ${unreadCount}개`}
              />
            )}
          </p>
          {lesson.description && (
            <p className="mt-1 text-xs text-zinc-500">{lesson.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          질문 보기 ({lesson.threads.length})
          {isOpen ? "▲" : "▼"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3">
          {lesson.threads.length === 0 && (
            <p className="text-center text-sm text-zinc-400">
              학생이 남긴 질문이 없습니다.
            </p>
          )}
          {lesson.threads.map((thread) => (
            <div key={thread.id} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-zinc-500">
                {thread.studentName} ({thread.studentUsername})
              </p>
              <QuestionThread
                messages={thread.messages}
                updateMessageAction={updateAction}
                deleteMessageAction={deleteAction}
                replyAction={(formData) => replyAction(thread.id, formData)}
                replyPlaceholder="답변을 입력하세요"
                replyButtonLabel="답변 등록"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
