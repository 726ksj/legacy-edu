"use client";

import { useState, useTransition } from "react";
import { type FaqActionState } from "./actions";

export interface FaqRowData {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export default function FaqRow({
  faq,
  onUpdate,
  onDelete,
}: {
  faq: FaqRowData;
  onUpdate: (formData: FormData) => Promise<FaqActionState>;
  onDelete: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleSave(formData: FormData) {
    startSaveTransition(async () => {
      const result = await onUpdate(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setIsEditing(false);
      }
    });
  }

  if (isEditing) {
    return (
      <li className="rounded-lg border border-zinc-200 bg-white p-4">
        <form action={handleSave} className="flex flex-col gap-2">
          <input
            name="question"
            required
            defaultValue={faq.question}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
          <textarea
            name="answer"
            required
            rows={3}
            defaultValue={faq.answer}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
          {error && <p className="text-xs font-medium text-red-500">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsEditing(false);
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            >
              취소
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">
            Q. {faq.question}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-500">
            A. {faq.answer}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-semibold text-brand-dark hover:underline"
          >
            수정
          </button>
          <form
            className="inline-flex"
            action={() => startDeleteTransition(() => onDelete())}
            onSubmit={(e) => {
              if (!window.confirm("이 FAQ를 삭제할까요?")) {
                e.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              disabled={isDeleting}
              className="text-xs font-semibold text-red-500 hover:text-red-600"
            >
              삭제
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
