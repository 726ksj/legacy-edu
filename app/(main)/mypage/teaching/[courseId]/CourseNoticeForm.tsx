"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourseNotice, type CourseNoticeActionState } from "./actions";

const initialState: CourseNoticeActionState = {};

export default function CourseNoticeForm({ courseId }: { courseId: string }) {
  const boundCreate = createCourseNotice.bind(null, courseId);
  const [state, formAction, isPending] = useActionState(
    boundCreate,
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
      <p className="text-sm font-semibold text-zinc-900">새 강좌 공지 작성</p>
      <input
        name="title"
        required
        placeholder="제목"
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      <textarea
        name="content"
        required
        rows={3}
        placeholder="내용"
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
        {isPending ? "등록 중..." : "등록"}
      </button>
    </form>
  );
}
