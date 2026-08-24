"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCourse, updateCourse, type CreateCourseState } from "./actions";
import PriceInput from "./PriceInput";

const initialState: CreateCourseState = {};

interface Instructor {
  id: string;
  name: string;
  subject: string;
}

export interface EditingCourse {
  id: string;
  subject: string;
  title: string;
  instructor_id: string | null;
  school: string | null;
  overview: string | null;
  level: string | null;
  tagline: string | null;
  is_best: boolean;
  duration_days: number | null;
  price: number;
}

export default function CourseForm({
  instructors,
  editingCourse,
}: {
  instructors: Instructor[];
  editingCourse?: EditingCourse | null;
}) {
  const action = editingCourse
    ? updateCourse.bind(null, editingCourse.id)
    : createCourse;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // PriceInput은 React가 값을 직접 들고 있는 controlled input이라
  // formRef.reset()(네이티브 리셋)이 DOM만 비우고 React state는 그대로 남아,
  // 다음 렌더에서 React가 예전 값을 다시 채워 넣어버린다. key를 바꿔
  // 컴포넌트를 통째로 새로 마운트시켜야 확실히 비워진다. state가 바뀐
  // 시점(렌더 도중)에 바로 반영해야 해서 effect가 아니라 렌더 중에 처리한다.
  const [priceInputKey, setPriceInputKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success && !editingCourse) {
      setPriceInputKey((key) => key + 1);
    }
  }

  useEffect(() => {
    if (state.success && !editingCourse) {
      formRef.current?.reset();
    }
    if (state.success) {
      // revalidatePath만으로는 이 페이지의 강좌 목록 표가 즉시 갱신되지
      // 않는 경우가 있어, 성공 시 명시적으로 새로고침해 항상 최신 값을 보여준다.
      router.refresh();
    }
  }, [state, editingCourse, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      autoComplete="off"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          과정
          <select
            name="level"
            defaultValue={editingCourse?.level ?? ""}
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
            defaultValue={editingCourse?.school ?? ""}
            placeholder="예: 분당고"
            autoComplete="off"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          강좌명
          <input
            name="title"
            defaultValue={editingCourse?.title ?? ""}
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
            defaultValue={editingCourse?.instructor_id ?? ""}
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
          수강기간(주)
          <input
            name="durationWeeks"
            type="number"
            min={0}
            defaultValue={
              editingCourse?.duration_days != null
                ? Math.round(editingCourse.duration_days / 7)
                : ""
            }
            placeholder="13"
            autoComplete="off"
            className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          PC 수강권 가격(원)
          <PriceInput
            key={priceInputKey}
            name="price"
            defaultValue={editingCourse?.price ?? ""}
            placeholder="51,000"
            className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm font-medium text-zinc-700">
          <input
            name="isBest"
            type="checkbox"
            defaultChecked={editingCourse?.is_best ?? false}
            className="h-4 w-4 accent-brand"
          />
          BEST 뱃지
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        목록에 보여줄 한 줄 소개 (선택)
        <input
          name="tagline"
          defaultValue={editingCourse?.tagline ?? ""}
          placeholder="예: 12가지 후치수식과 동사 7일 완성!"
          autoComplete="off"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        강좌 개요 (선택)
        <textarea
          name="overview"
          defaultValue={editingCourse?.overview ?? ""}
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || instructors.length === 0}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending
            ? editingCourse
              ? "저장 중..."
              : "등록 중..."
            : editingCourse
              ? "수정 저장"
              : "강좌 등록"}
        </button>
        {editingCourse && (
          <Link
            href="/admin/courses"
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-700"
          >
            취소
          </Link>
        )}
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && editingCourse && (
        <p className="text-sm font-medium text-brand-dark">저장되었습니다.</p>
      )}
    </form>
  );
}
