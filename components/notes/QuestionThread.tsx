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
  // 이 메시지를 지금 보고 있는 사람이 직접 쓴 것이라 수정/삭제할 수
  // 있으면 true (예: 학생 본인 화면에서 자기가 쓴 최초 질문/후속 질문).
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function QuestionThread({
  messages,
  updateMessageAction,
  deleteMessageAction,
  replyAction,
  replyPlaceholder = "답을 이어서 남겨보세요.",
  replyButtonLabel = "등록",
}: {
  messages: ThreadMessageView[];
  // 메시지별 수정/삭제 - canEdit/canDelete가 true인 메시지에만 버튼이 뜬다.
  updateMessageAction?: (
    messageId: string,
    formData: FormData,
  ) => Promise<ActionResult>;
  deleteMessageAction?: (messageId: string) => Promise<void>;
  // 넘기면 하단에 답글 입력창이 뜬다 (학생 화면=후속 질문, 스태프
  // 화면=답변).
  replyAction?: (formData: FormData) => Promise<ActionResult>;
  replyPlaceholder?: string;
  replyButtonLabel?: string;
}) {
  const [root, ...replies] = messages;

  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplyPending, startReplyTransition] = useTransition();
  const replyFormRef = useRef<HTMLFormElement>(null);

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
      <MessageRow
        message={root}
        variant="plain"
        updateMessageAction={updateMessageAction}
        deleteMessageAction={deleteMessageAction}
      />

      {replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
          {replies.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              variant={message.isFromStudent ? "student" : "staff"}
              updateMessageAction={updateMessageAction}
              deleteMessageAction={deleteMessageAction}
            />
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

function MessageRow({
  message,
  variant,
  updateMessageAction,
  deleteMessageAction,
}: {
  message: ThreadMessageView;
  variant: "plain" | "student" | "staff";
  updateMessageAction?: (
    messageId: string,
    formData: FormData,
  ) => Promise<ActionResult>;
  deleteMessageAction?: (messageId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canEdit = Boolean(message.canEdit && updateMessageAction);
  const canDelete = Boolean(message.canDelete && deleteMessageAction);

  function handleSubmit(formData: FormData) {
    if (!updateMessageAction) return;
    startTransition(async () => {
      const result = await updateMessageAction(message.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setIsEditing(false);
    });
  }

  if (isEditing) {
    return (
      <div className={variant !== "plain" ? "rounded-md bg-zinc-50 p-3" : undefined}>
        <form action={handleSubmit} className="flex flex-col gap-2">
          <textarea
            name="content"
            required
            rows={3}
            defaultValue={message.content}
            autoFocus
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
          {error && (
            <p className="text-sm font-medium text-red-500">{error}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    );
  }

  const actionsRow = (canEdit || canDelete) && (
    <div className="flex shrink-0 items-center gap-3">
      {canEdit && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-semibold text-zinc-500 hover:text-brand-dark"
        >
          수정
        </button>
      )}
      {canDelete && deleteMessageAction && (
        <DeleteNoteButton action={() => deleteMessageAction(message.id)} />
      )}
    </div>
  );

  // 첫 줄은 "작성자 / 날짜"를 좌우로 짝짓고, 둘째 줄은 그와 똑같은
  // 모양으로 "내용 / 수정·삭제"를 좌우로 짝짓는다.
  if (variant === "plain") {
    return (
      <div>
        <p className="text-right text-xs text-zinc-400">
          {message.createdAt}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="whitespace-pre-wrap text-sm text-zinc-900">
            {message.content}
          </p>
          {actionsRow}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "student"
          ? "rounded-md bg-zinc-50 p-3"
          : "rounded-md bg-brand-light/40 p-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={
            variant === "student"
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
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="whitespace-pre-wrap text-sm text-zinc-900">
          {message.content}
        </p>
        {actionsRow}
      </div>
    </div>
  );
}
