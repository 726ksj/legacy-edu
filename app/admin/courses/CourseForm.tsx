"use client";

import { useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import { createCourse, type CreateCourseState } from "./actions";

const initialState: CreateCourseState = {};

interface Instructor {
  id: string;
  name: string;
  subject: string;
}

export default function CourseForm({
  instructors,
}: {
  instructors: Instructor[];
}) {
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
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
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
          강사
          <select
            name="instructorId"
            required
            defaultValue=""
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="" disabled>
              선택
            </option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name} ({instructor.subject})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          학교 (선택)
          <input
            name="school"
            placeholder="예: 분당고등학교"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        대표 이미지 URL (선택)
        <input
          name="thumbnailUrl"
          placeholder="https://..."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        강좌 개요 (선택)
        <textarea
          name="overview"
          rows={3}
          placeholder="학생에게 보여줄 강좌 소개 문구를 입력하세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      {instructors.length === 0 && (
        <p className="text-xs text-zinc-500">
          먼저{" "}
          <Link
            href="/admin/instructors"
            className="font-semibold text-brand-dark hover:underline"
          >
            강사 관리
          </Link>
          에서 강사를 등록해주세요.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || instructors.length === 0}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "강좌 등록"}
      </button>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
    </form>
  );
}
