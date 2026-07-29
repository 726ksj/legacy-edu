"use client";

import { useActionState, useRef, useEffect } from "react";
import { createEnrollment, type CreateEnrollmentState } from "./actions";

const initialState: CreateEnrollmentState = {};

interface Course {
  id: string;
  subject: string;
  title: string;
}

interface Student {
  id: string;
  name: string;
  username: string;
}

export default function EnrollmentForm({
  courses,
  students,
}: {
  courses: Course[];
  students: Student[];
}) {
  const [state, formAction, isPending] = useActionState(
    createEnrollment,
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
        강좌
        <select
          name="courseId"
          required
          defaultValue=""
          className="min-w-[16rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="" disabled>
            선택
          </option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              [{course.subject}] {course.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학생
        <select
          name="profileId"
          required
          defaultValue=""
          className="min-w-[14rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="" disabled>
            선택
          </option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name} ({student.username})
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "수강 등록"}
      </button>

      {state.error && (
        <p className="w-full text-sm font-medium text-red-500">{state.error}</p>
      )}
    </form>
  );
}
