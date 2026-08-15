"use client";

import { useState, useTransition } from "react";

export interface ScoreReportEntry {
  id: string;
  title: string;
  subject: string | null;
  score: string;
  examDate: string | null;
  memo: string | null;
}

interface ActionResult {
  error?: string;
  success?: boolean;
}

export default function ScoreReportSection({
  label,
  entries,
  addAction,
  updateAction,
  deleteAction,
}: {
  label: string;
  entries: ScoreReportEntry[];
  addAction: (formData: FormData) => Promise<ActionResult>;
  updateAction: (id: string, formData: FormData) => Promise<ActionResult>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="text-xs font-semibold text-brand-dark hover:underline"
        >
          {isAdding ? "취소" : "+ 추가"}
        </button>
      </div>

      {isAdding && (
        <ScoreEntryForm
          submitLabel="추가"
          onCancel={() => setIsAdding(false)}
          onSubmit={async (formData) => {
            const result = await addAction(formData);
            if (!result.error) setIsAdding(false);
            return result;
          }}
        />
      )}

      {entries.length === 0 && !isAdding && (
        <p className="px-4 py-6 text-center text-sm text-zinc-400">
          등록된 리포트가 없습니다.
        </p>
      )}

      {entries.length > 0 && (
        <ul className="divide-y divide-zinc-100">
          {entries.map((entry) => (
            <ScoreEntryRow
              key={entry.id}
              entry={entry}
              onUpdate={(formData) => updateAction(entry.id, formData)}
              onDelete={() => deleteAction(entry.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreEntryForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: ScoreReportEntry;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await onSubmit(formData);
      setError(result.error ?? null);
    });
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          name="title"
          required
          placeholder="시험명"
          defaultValue={defaultValues?.title}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
        <input
          name="subject"
          placeholder="과목 (선택)"
          defaultValue={defaultValues?.subject ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
        <input
          name="score"
          required
          placeholder="점수"
          defaultValue={defaultValues?.score}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
        <input
          name="examDate"
          type="date"
          defaultValue={defaultValues?.examDate ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </div>
      <textarea
        name="memo"
        placeholder="메모 (선택)"
        rows={2}
        defaultValue={defaultValues?.memo ?? ""}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "저장 중..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function ScoreEntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: ScoreReportEntry;
  onUpdate: (formData: FormData) => Promise<ActionResult>;
  onDelete: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  if (isEditing) {
    return (
      <li>
        <ScoreEntryForm
          defaultValues={entry}
          submitLabel="저장"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (formData) => {
            const result = await onUpdate(formData);
            if (!result.error) setIsEditing(false);
            return result;
          }}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-900">
          {entry.title}
          {entry.subject && (
            <span className="ml-2 text-xs font-normal text-zinc-500">
              [{entry.subject}]
            </span>
          )}
          <span className="ml-2 text-sm font-semibold text-brand-dark">
            {entry.score}
          </span>
        </p>
        {(entry.examDate || entry.memo) && (
          <p className="mt-0.5 text-xs text-zinc-400">
            {entry.examDate}
            {entry.examDate && entry.memo && " · "}
            {entry.memo}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-semibold text-zinc-500 hover:text-brand-dark"
        >
          수정
        </button>
        <form
          action={() => startDeleteTransition(() => onDelete())}
          onSubmit={(e) => {
            if (!window.confirm("이 리포트를 삭제할까요?")) {
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
