"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCourse, updateCourse, type CreateCourseState } from "./actions";
import PriceInput from "./PriceInput";

const initialState: CreateCourseState = {};

const INPUT_CLASS =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold text-zinc-900">
        {title}
        {description && (
          <span className="ml-2 text-xs font-normal text-zinc-400">
            {description}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

// 라벨 - 입력 - 안내문 순서로 쌓아, 안내문이 있든 없든 같은 줄의 입력칸
// 높이와 위치가 어긋나지 않게 한다.
function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 text-sm font-medium text-zinc-700 ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-zinc-400">{hint}</span>}
    </div>
  );
}

interface Instructor {
  id: string;
  name: string;
  subject: string;
  profile_id: string | null;
}

interface TeacherAccount {
  id: string;
  name: string;
  username: string;
}

export interface EditingCourse {
  id: string;
  subject: string;
  title: string;
  instructor_id: string | null;
  school: string | null;
  level: string | null;
  is_best: boolean;
  duration_days: number | null;
  start_date: string | null;
  price: number;
  course_scope: string | null;
  content_features: string | null;
  target_audience: string | null;
}

export default function CourseForm({
  instructors,
  assistants,
  editingCourse,
  editingAssistantProfileId,
}: {
  instructors: Instructor[];
  assistants: TeacherAccount[];
  editingCourse?: EditingCourse | null;
  editingAssistantProfileId?: string | null;
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
      className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <FormSection title="기본 정보">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="과정" className="lg:col-span-1">
            <select
              name="level"
              defaultValue={editingCourse?.level ?? ""}
              className={INPUT_CLASS}
            >
              <option value="">미지정</option>
              <option value="middle">중등</option>
              <option value="high">고등</option>
            </select>
          </Field>
          <Field label="학교 (선택)" className="lg:col-span-2">
            <input
              name="school"
              defaultValue={editingCourse?.school ?? ""}
              placeholder="예: 분당고"
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="강좌명" className="sm:col-span-2 lg:col-span-3">
            <input
              name="title"
              defaultValue={editingCourse?.title ?? ""}
              placeholder="예: 분당고 내신 영어"
              required
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="담당">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="강사"
            hint="이 강사의 로그인 계정이 영상 업로드·공지 작성 권한을 갖습니다."
          >
            <select
              name="instructorId"
              required
              defaultValue={editingCourse?.instructor_id ?? ""}
              className={INPUT_CLASS}
            >
              <option value="" disabled>
                선택
              </option>
              {instructors.map((instructor) => (
                <option
                  key={instructor.id}
                  value={instructor.id}
                  disabled={!instructor.profile_id && !editingCourse}
                >
                  {instructor.name} ({instructor.subject})
                  {instructor.profile_id ? "" : " - 계정 미연결"}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="조교 (선택)"
            hint="이 강좌 수강생의 성적 관리 권한을 가질 로그인 계정입니다."
          >
            <select
              name="assistantProfileId"
              defaultValue={editingAssistantProfileId ?? ""}
              className={INPUT_CLASS}
            >
              <option value="">배정 안 함</option>
              {assistants.map((assistant) => (
                <option key={assistant.id} value={assistant.id}>
                  {assistant.name} ({assistant.username})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="수강 설정">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="수강 기간(주)"
            hint="주차별 관리의 주차 수로도 쓰입니다. 비우면 주차 없음."
          >
            <input
              name="durationWeeks"
              type="number"
              min={0}
              defaultValue={
                editingCourse?.duration_days != null
                  ? Math.round(editingCourse.duration_days / 7)
                  : ""
              }
              placeholder="예: 8"
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="강좌 시작일" hint="주차별 날짜 계산의 기준입니다.">
            <input
              name="startDate"
              type="date"
              defaultValue={editingCourse?.start_date ?? ""}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="PC 수강권 가격(원)">
            <PriceInput
              key={priceInputKey}
              name="price"
              defaultValue={editingCourse?.price ?? ""}
              placeholder="51,000"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="노출">
            <label className="flex h-[38px] items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm text-zinc-700">
              <input
                name="isBest"
                type="checkbox"
                defaultChecked={editingCourse?.is_best ?? false}
                className="h-4 w-4 accent-brand"
              />
              BEST 뱃지
            </label>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="강좌 정보"
        description="선택 · 상세 페이지의 강좌 정보 표에 표시됩니다."
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          강좌 범위
          <textarea
            name="courseScope"
            defaultValue={editingCourse?.course_scope ?? ""}
            rows={3}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          내용 및 특징
          <textarea
            name="contentFeatures"
            defaultValue={editingCourse?.content_features ?? ""}
            rows={5}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          수강 대상
          <textarea
            name="targetAudience"
            defaultValue={editingCourse?.target_audience ?? ""}
            rows={2}
            className={INPUT_CLASS}
          />
        </label>
      </FormSection>

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
