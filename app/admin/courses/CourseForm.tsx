"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCourse, type CreateCourseState } from "./actions";

const initialState: CreateCourseState = {};

const SUBJECTS = ["국어", "수학", "영어", "사회", "과학"];

export default function CourseForm() {
  const [state, formAction, isPending] = useActionState(
    createCourse,
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
        과목
        <select
          name="subject"
          required
          defaultValue=""
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="" disabled>
            선택
          </option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        강좌명
        <input
          name="title"
          placeholder="예: 분당고 내신 영어"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        선생님
        <input
          name="teacherName"
          placeholder="예: 박정근"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학교 (선택)
        <input
          name="school"
          placeholder="예: 분당고등학교"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "강좌 등록"}
      </button>

      {state.error && (
        <p className="w-full text-sm font-medium text-red-500">{state.error}</p>
      )}
    </form>
  );
}
