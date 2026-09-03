"use client";

import { useRef, useState, useTransition } from "react";
import DeleteNoteButton from "./DeleteNoteButton";

interface ActionResult {
  error?: string;
  success?: boolean;
}

export interface ThreadMessageView {
  id: string;
  authorLabel: string;
  isFromStudent: boolean;
  content: string;
  createdAt: string;
}

export default function QuestionThread({
  messages,
  updateRootAction,
  deleteRootAction,
  replyAction,
  replyPlaceholder = "답을 이어서 남겨보세요.",
  replyButtonLabel = "등록",
}: {
  messages: ThreadMessageView[];
  // 최초 질문(messages[0])의 내용 수정·삭제 - 학생 본인 화면에서만 넘긴다.
  updateRootAction?: (formData: FormData) => Promise<ActionResult>;
  deleteRootAction?: () => Promise<void>;
  // 넘기면 하단에 답글 입력창이 뜬다 (학생 화면=후속 질문, 스태프
  // 화면=답변).
  replyAction?: (formData: FormData) => Promise<ActionResult>;
  replyPlaceholder?: string;
  replyButtonLabel?: string;
}) {
  const [root, ...replies] = messages;
  const [isEditingRoot, setIsEditingRoot] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [isRootPending, startRootTransition] = useTransition();

  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplyPending, startReplyTransition] = useTransition();
  const replyFormRef = useRef<HTMLFormElement>(null);

  function handleRootSubmit(formData: FormData) {
    if (!updateRootAction) return;
    startRootTransition(async () => {
      const result = await updateRootAction(formData);
      if (result.error) {
        setRootError(result.error);
        return;
      }
      setRootError(null);
      setIsEditingRoot(false);
    });
  }

  function handleReplySubmit(formData: FormData) {
    if (!replyAction) return;
    startReplyTransition(async () => {
      const result = await replyAction(formData);
      if (result.error) {
        setReplyError(result.error);
        return;
      }
      setReplyError(null);
      replyFormRef.current?.reset();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      {isEditingRoot ? (
        <form action={handleRootSubmit} className="flex flex-col gap-2">
          <textarea
            name="content"
            required
            rows={3}
            defaultValue={root.content}
            autoFocus
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
          {rootError && (
            <p className="text-sm font-medium text-red-500">{rootError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isRootPending}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isRootPending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditingRoot(false);
                setRootError(null);
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className="whitespace-pre-wrap text-sm text-zinc-900">
            {root.content}
          </p>
          {(updateRootAction || deleteRootAction) && (
            <div className="flex shrink-0 items-center gap-2">
              {updateRootAction && (
                <button
                  type="button"
                  onClick={() => setIsEditingRoot(true)}
                  className="text-xs font-semibold text-zinc-500 hover:text-brand-dark"
                >
                  수정
                </button>
              )}
              {deleteRootAction && (
                <DeleteNoteButton action={deleteRootAction} />
              )}
            </div>
          )}
        </div>
      )}
      <p className="mt-1 text-xs text-zinc-400">{root.createdAt}</p>

      {replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
          {replies.map((message) => (
            <div
              key={message.id}
              className={
                message.isFromStudent
                  ? "rounded-md bg-zinc-50 p-3"
                  : "rounded-md bg-brand-light/40 p-3"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={
                    message.isFromStudent
                      ? "text-xs font-semibold text-zinc-500"
                      : "text-xs font-semibold text-brand-dark"
                  }
                >
                  {message.authorLabel}
                </p>
                <span className="shrink-0 text-xs text-zinc-400">
                  {message.createdAt}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                {message.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {replyAction && (
        <form
          ref={replyFormRef}
          action={handleReplySubmit}
          className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3"
        >
          <textarea
            name="content"
            required
            rows={2}
            placeholder={replyPlaceholder}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
          {replyError && (
            <p className="text-sm font-medium text-red-500">{replyError}</p>
          )}
          <button
            type="submit"
            disabled={isReplyPending}
            className="self-start rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {isReplyPending ? "등록 중..." : replyButtonLabel}
          </button>
        </form>
      )}
    </div>
  );
}
