"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { type CategoryActionState } from "./actions";

export interface CategoryRowData {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
  max_score: number;
  extra_field_labels: string[];
}

export default function CategoryRow({
  category,
  reportCount,
  onUpdate,
  onDelete,
}: {
  category: CategoryRowData;
  reportCount: number;
  onUpdate: (formData: FormData) => Promise<CategoryActionState>;
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              name="label"
              required
              defaultValue={category.label}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              name="description"
              defaultValue={category.description ?? ""}
              placeholder="설명 (선택)"
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              name="maxScore"
              type="number"
              min={1}
              step="any"
              required
              defaultValue={category.max_score}
              placeholder="만점 (예: 100)"
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              name="extraFields"
              defaultValue={category.extra_field_labels.join(", ")}
              placeholder="추가 필드 (선택, 콤마로 구분 — 예: 백분위, 등급)"
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand sm:col-span-3"
            />
          </div>
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
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900">
          {category.label}
        </p>
        {category.description && (
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {category.description}
          </p>
        )}
        <p className="mt-0.5 text-xs text-zinc-400">
          연결된 리포트 {reportCount}건 · 만점 {category.max_score}점
          {category.extra_field_labels.length > 0 &&
            ` · 추가 필드 ${category.extra_field_labels.join(", ")}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href={`/admin/score-report-categories/${category.id}`}
          className="text-xs font-semibold text-zinc-500 hover:underline"
        >
          보기
        </Link>
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
            const message =
              reportCount > 0
                ? `이 카테고리를 삭제하면 연결된 리포트 ${reportCount}건이 학생 화면과 회원 상세 페이지에서 보이지 않게 됩니다 (데이터 자체는 남아있음). 삭제할까요?`
                : "이 카테고리를 삭제할까요?";
            if (!window.confirm(message)) {
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
