"use client";

import { useActionState } from "react";
import { updateCourse, type CreateCourseState } from "../actions";

const initialState: CreateCourseState = {};

const SUBJECTS = ["국어", "수학", "영어", "사회", "과학"];

interface Instructor {
  id: string;
  name: string;
}

interface CourseData {
  id: string;
  subject: string;
  title: string;
  instructor_id: string | null;
  school: string | null;
  thumbnail_url: string | null;
  overview: string | null;
}

export default function EditCourseForm({
  course,
  instructors,
}: {
  course: CourseData;
  instructors: Instructor[];
}) {
  const boundUpdateCourse = updateCourse.bind(null, course.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdateCourse,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          과목
          <select
            name="subject"
            required
            defaultValue={course.subject}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
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
            defaultValue={course.title}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          강사
          <select
            name="instructorId"
            required
            defaultValue={course.instructor_id ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="" disabled>
              선택
            </option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          학교 (선택)
          <input
            name="school"
            defaultValue={course.school ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        대표 이미지 URL (선택)
        <input
          name="thumbnailUrl"
          defaultValue={course.thumbnail_url ?? ""}
          placeholder="https://..."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        강좌 개요 (선택)
        <textarea
          name="overview"
          defaultValue={course.overview ?? ""}
          rows={3}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">저장되었습니다.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
