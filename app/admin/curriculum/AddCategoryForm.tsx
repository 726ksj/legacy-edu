"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type CategoryActionState } from "./actions";

const initialState: CategoryActionState = {};

export default function AddCategoryForm() {
  const [state, formAction, isPending] = useActionState(
    createCategory,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <p className="text-sm font-semibold text-zinc-900">새 커리큘럼 추가</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          제목
          <input
            name="title"
            required
            placeholder="예: 개인별 난이도·취약점 맞춤 시스템"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          슬러그 (URL, 영문/숫자/하이픈)
          <input
            name="slug"
            required
            placeholder="예: personalized-system"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        부제 (선택, 강조 배지로 표시)
        <input
          name="subtitle"
          placeholder="예: 학생마다 다른 실력, 같은 문제를 풀 필요는 없습니다"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        소개문 (선택)
        <textarea
          name="intro"
          rows={2}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          마무리 배지 제목 (선택)
          <input
            name="closingTitle"
            placeholder="예: 수업의 목표"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          마무리 배지 설명 (선택)
          <input
            name="closingDescription"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>

      {state.error && (
        <p className="text-xs font-medium text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "추가 중..." : "추가"}
      </button>
    </form>
  );
}
