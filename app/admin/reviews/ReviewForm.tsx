"use client";

import { useActionState, useRef, useEffect } from "react";
import { createReview, type ReviewFormState } from "./actions";

const initialState: ReviewFormState = {};

export default function ReviewForm() {
  const [state, formAction, isPending] = useActionState(
    createReview,
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
      className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이름 (마스킹 표기)
        <input
          name="name"
          required
          placeholder="예: 박*준"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학교
        <input
          name="school"
          required
          placeholder="예: 분당고"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        과목
        <input
          name="subject"
          required
          placeholder="예: 영어"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        한줄 요약
        <input
          name="summary"
          required
          placeholder="예: 내신 영어 등급이 3등급이나 상승했어요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
        상세 후기
        <textarea
          name="detail"
          required
          rows={3}
          placeholder="View 클릭 시 보여줄 상세 후기 내용을 입력해주세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark sm:col-span-2">
          등록되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:col-span-2"
      >
        {isPending ? "등록 중..." : "리뷰 등록"}
      </button>
    </form>
  );
}
