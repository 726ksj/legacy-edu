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
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <p className="text-sm font-semibold text-zinc-900">새 카테고리 추가</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          name="label"
          required
          placeholder="이름 (예: 단어 테스트)"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand sm:col-span-1"
        />
        <input
          name="description"
          placeholder="설명 (선택)"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand sm:col-span-1"
        />
        <input
          name="maxScore"
          type="number"
          min={1}
          step="any"
          required
          defaultValue={100}
          placeholder="만점 (예: 100)"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand sm:col-span-1"
        />
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
