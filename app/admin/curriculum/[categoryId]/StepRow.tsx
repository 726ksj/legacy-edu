"use client";

import { useState, useTransition } from "react";
import { type StepActionState } from "../actions";
import IconSelect, { IconPreview } from "./IconSelect";

export interface StepRowData {
  id: string;
  icon: string;
  title: string;
  description: string | null;
}

export default function StepRow({
  step,
  onUpdate,
  onDelete,
}: {
  step: StepRowData;
  onUpdate: (formData: FormData) => Promise<StepActionState>;
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
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              아이콘
              <IconSelect name="icon" defaultValue={step.icon} />
            </label>
            <input
              name="title"
              required
              defaultValue={step.title}
              className="min-w-40 flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <textarea
            name="description"
            rows={2}
            defaultValue={step.description ?? ""}
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
    <li className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <IconPreview iconKey={step.icon} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{step.title}</p>
          {step.description && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-500">
              {step.description}
            </p>
          )}
        </div>
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
            if (!window.confirm("이 단계를 삭제할까요?")) {
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
    </li>
  );
}
