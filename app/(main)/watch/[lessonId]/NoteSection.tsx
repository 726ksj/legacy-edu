"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  saveNote,
  updateNote,
  deleteNote,
  replyToOwnQuestion,
  type SaveNoteState,
} from "./note-actions";
import QuestionThread, {
  type ThreadMessageView,
} from "@/components/notes/QuestionThread";

interface ThreadItem {
  id: string;
  messages: ThreadMessageView[];
}

const initialState: SaveNoteState = {};

export default function NoteSection({
  lessonId,
  threads,
}: {
  lessonId: string;
  threads: ThreadItem[];
}) {
  const boundSaveNote = saveNote.bind(null, lessonId);
  const [state, formAction, isPending] = useActionState(
    boundSaveNote,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-200 pt-6">
      <div>
        <p className="text-sm font-semibold text-zinc-700">질문하기</p>
        <p className="text-xs text-zinc-400">
          마이페이지 - 나의 질문에서 언제든 다시 확인할 수 있어요.
        </p>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <textarea
          name="content"
          required
          rows={3}
          placeholder="이 강의를 들으며 궁금한 점을 질문해보세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "등록 중..." : "질문 등록"}
        </button>
      </form>

      {threads.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-700">내 질문</p>
          {threads.map((thread) => (
            <QuestionThread
              key={thread.id}
              messages={thread.messages}
              updateMessageAction={(messageId, formData) =>
                updateNote(messageId, lessonId, {}, formData)
              }
              deleteMessageAction={(messageId) =>
                deleteNote(messageId, lessonId)
              }
              replyAction={(formData) =>
                replyToOwnQuestion(thread.id, lessonId, formData)
              }
              replyPlaceholder="답변에 이어서 궁금한 점을 남겨보세요."
              replyButtonLabel="질문 등록"
            />
          ))}
        </div>
      )}
    </div>
  );
}
