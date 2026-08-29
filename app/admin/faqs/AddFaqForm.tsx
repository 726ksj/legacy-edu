"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFaq, type FaqActionState } from "./actions";

const initialState: FaqActionState = {};

export default function AddFaqForm() {
  const [state, formAction, isPending] = useActionState(
    createFaq,
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
      <p className="text-sm font-semibold text-zinc-900">새 FAQ 추가</p>
      <input
        name="question"
        required
        placeholder="질문"
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      <textarea
        name="answer"
        required
        rows={2}
        placeholder="답변"
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
      />

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
