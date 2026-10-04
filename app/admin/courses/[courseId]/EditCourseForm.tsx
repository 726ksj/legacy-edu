"use client";

import { useActionState } from "react";
import { updateCourse, type CreateCourseState } from "../actions";
import PriceInput from "../PriceInput";

const initialState: CreateCourseState = {};

interface Instructor {
  id: string;
  name: string;
  subject: string;
}

interface CourseData {
  id: string;
  subject: string;
  title: string;
  instructor_id: string | null;
  school: string | null;
  level: string | null;
  is_best: boolean;
  duration_days: number | null;
  price: number;
  course_scope: string | null;
  content_features: string | null;
  target_audience: string | null;
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
      autoComplete="off"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          과정
          <select
            name="level"
            defaultValue={course.level ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="">미지정</option>
            <option value="middle">중등</option>
            <option value="high">고등</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          학교 (선택)
          <input
            name="school"
            defaultValue={course.school ?? ""}
            autoComplete="off"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
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
                {instructor.name} ({instructor.subject})
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-zinc-400">
            현재 과목: {course.subject}
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          수강기간(주)
          <input
            name="durationWeeks"
            type="number"
            min={0}
            defaultValue={
              course.duration_days != null
                ? Math.round(course.duration_days / 7)
                : ""
            }
            autoComplete="off"
            className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          PC 수강권 가격(원)
          <PriceInput
            name="price"
            defaultValue={course.price ?? 0}
            className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm font-medium text-zinc-700">
          <input
            name="isBest"
            type="checkbox"
            defaultChecked={course.is_best}
            className="h-4 w-4 accent-brand"
          />
          BEST 뱃지
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
        <p className="text-sm font-semibold text-zinc-800">
          강좌 정보{" "}
          <span className="font-normal text-zinc-400">
            (선택, 상세 페이지의 강좌 정보 표에 표시됩니다)
          </span>
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          강좌 범위
          <textarea
            name="courseScope"
            defaultValue={course.course_scope ?? ""}
            rows={3}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          내용 및 특징
          <textarea
            name="contentFeatures"
            defaultValue={course.content_features ?? ""}
            rows={5}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          수강 대상
          <textarea
            name="targetAudience"
            defaultValue={course.target_audience ?? ""}
            rows={2}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>

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
