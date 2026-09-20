"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStep, type StepActionState } from "../actions";
import IconSelect from "./IconSelect";

const initialState: StepActionState = {};

export default function AddStepForm({
  categoryId,
  slug,
}: {
  categoryId: string;
  slug: string;
}) {
  const createWithIds = createStep.bind(null, categoryId, slug);
  const [state, formAction, isPending] = useActionState(
    createWithIds,
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
      <p className="text-sm font-semibold text-zinc-900">새 단계 추가</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          아이콘
          <IconSelect name="icon" />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
          제목
          <input
            name="title"
            required
            placeholder="예: 수준 진단"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        설명 (선택, 여러 줄 가능)
        <textarea
          name="description"
          rows={2}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-xs font-medium text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "추가 중..." : "단계 추가"}
      </button>
    </form>
  );
}
