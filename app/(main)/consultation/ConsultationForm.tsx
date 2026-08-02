"use client";

import { useActionState } from "react";
import { submitConsultation, type ConsultationState } from "./actions";

const initialState: ConsultationState = {};

const GRADE_OPTIONS = ["1등급", "2등급", "3등급", "4등급", "5등급", "6등급", "7등급", "8등급", "9등급"];

export default function ConsultationForm() {
  const [state, formAction, isPending] = useActionState(
    submitConsultation,
    initialState,
  );

  if (state.success) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <p className="text-lg font-bold text-brand-dark">
          상담 신청이 접수되었습니다.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          입력해주신 연락처로 순차적으로 연락드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        <span>신청자 구분</span>
        <div className="flex gap-4 text-sm text-zinc-700">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="role" value="학생" required />
            학생
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="role" value="학부모" required />
            학부모
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학교 (본인/자녀)
        <input
          name="school"
          required
          placeholder="예: 분당고등학교"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학년 (본인/자녀)
        <select
          name="grade"
          required
          defaultValue=""
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="" disabled>
            선택해주세요
          </option>
          <option value="고1">고1</option>
          <option value="고2">고2</option>
          <option value="고3">고3</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        전화번호
        <input
          name="phone"
          type="tel"
          required
          placeholder="010-0000-0000"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        <span>원하는 상담 과목</span>
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
          영어 (현재 영어만 서비스 중입니다.)
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        모의고사 영어 등급 (선택)
        <select
          name="mockGrade"
          defaultValue=""
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="">선택 안 함</option>
          {GRADE_OPTIONS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        내신 영어성적 등급 (선택)
        <select
          name="schoolExamGrade"
          defaultValue=""
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="">선택 안 함</option>
          {GRADE_OPTIONS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        상담 받고 싶은 내용
        <textarea
          name="message"
          required
          rows={4}
          placeholder="상담 받고 싶은 내용을 간단히 기재해주세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "신청 중..." : "상담 신청하기"}
      </button>
    </form>
  );
}
