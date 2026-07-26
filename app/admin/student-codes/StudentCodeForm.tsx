"use client";

import { useActionState, useRef, useEffect } from "react";
import { createStudentCode, type CreateStudentCodeState } from "./actions";

const initialState: CreateStudentCodeState = {};

export default function StudentCodeForm() {
  const [state, formAction, isPending] = useActionState(
    createStudentCode,
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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학생코드
        <input
          name="code"
          placeholder="예: a1b2c3"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학생 이름
        <input
          name="studentName"
          placeholder="예: 박짱구"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "코드 등록"}
      </button>

      {state.error && (
        <p className="w-full text-sm font-medium text-red-500">{state.error}</p>
      )}
    </form>
  );
}
