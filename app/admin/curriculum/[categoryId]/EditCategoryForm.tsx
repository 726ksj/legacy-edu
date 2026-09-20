"use client";

import { useState, useTransition } from "react";
import { updateCategory } from "../actions";

export interface EditableCategory {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  intro: string | null;
  closing_title: string | null;
  closing_description: string | null;
}

export default function EditCategoryForm({
  category,
}: {
  category: EditableCategory;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateCategory(category.id, formData);
      if (result.error) {
        setError(result.error);
        setSaved(false);
      } else {
        setError(null);
        setSaved(true);
      }
    });
  }

  return (
    <form
      action={handleSave}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          제목
          <input
            name="title"
            required
            defaultValue={category.title}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          슬러그 (URL, 영문/숫자/하이픈)
          <input
            name="slug"
            required
            defaultValue={category.slug}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        부제 (선택, 강조 배지로 표시)
        <input
          name="subtitle"
          defaultValue={category.subtitle ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        소개문 (선택)
        <textarea
          name="intro"
          rows={2}
          defaultValue={category.intro ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          마무리 배지 제목 (선택)
          <input
            name="closingTitle"
            defaultValue={category.closing_title ?? ""}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          마무리 배지 설명 (선택)
          <input
            name="closingDescription"
            defaultValue={category.closing_description ?? ""}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      {saved && !error && (
        <p className="text-xs font-medium text-brand-dark">저장되었습니다.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
