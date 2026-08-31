"use client";

import { useActionState, useRef, useEffect } from "react";
import { createInstructor, type InstructorFormState } from "./actions";
import { SUBJECTS } from "@/lib/subjects";

const initialState: InstructorFormState = {};

interface TeacherAccount {
  id: string;
  name: string;
  username: string;
}

export default function InstructorForm({
  teachers,
}: {
  teachers: TeacherAccount[];
}) {
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
          사진 (선택)
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:border-brand hover:file:text-brand-dark"
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
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        연결된 선생님 계정 (선택)
        <select
          name="profileId"
          defaultValue=""
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="">연결 안 함</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.username})
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-400">
          연결하면 회원코드 관리에서 이 계정을 삭제할 때 강사 카드도 함께 삭제됩니다.
        </span>
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
