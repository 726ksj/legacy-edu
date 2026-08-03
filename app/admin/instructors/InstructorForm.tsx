"use client";

import { useActionState, useRef, useEffect } from "react";
import { createInstructor, type InstructorFormState } from "./actions";

const initialState: InstructorFormState = {};

export default function InstructorForm() {
  const [state, formAction, isPending] = useActionState(
    createInstructor,
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
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          강사 이름
          <input
            name="name"
            placeholder="예: 박정근"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          사진 URL (선택)
          <input
            name="photoUrl"
            placeholder="https://..."
            className="min-w-[16rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        소개 (선택)
        <textarea
          name="bio"
          rows={3}
          placeholder="강사 소개 문구를 입력하세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "강사 등록"}
      </button>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
    </form>
  );
}
