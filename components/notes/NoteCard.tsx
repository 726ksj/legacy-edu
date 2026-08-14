"use client";

import { type ReactNode, useState, useTransition } from "react";
import DeleteNoteButton from "./DeleteNoteButton";

interface UpdateNoteResult {
  error?: string;
  success?: boolean;
}

export default function NoteCard({
  content,
  updateAction,
  deleteAction,
  header,
  footer,
}: {
  content: string;
  updateAction: (formData: FormData) => Promise<UpdateNoteResult>;
  deleteAction: () => Promise<void>;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setIsEditing(false);
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      {header}

      {isEditing ? (
        <form action={handleSubmit} className="mt-2 flex flex-col gap-2">
          <textarea
            name="content"
            required
            rows={3}
            defaultValue={content}
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
      ) : (
        <>
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="whitespace-pre-wrap text-sm text-zinc-900">
              {content}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-zinc-500 hover:text-brand-dark"
              >
                수정
              </button>
              <DeleteNoteButton action={deleteAction} />
            </div>
          </div>
          {footer}
        </>
      )}
    </div>
  );
}
