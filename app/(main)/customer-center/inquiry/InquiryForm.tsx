"use client";

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "./actions";

const initialState: InquiryState = {};

export default function InquiryForm() {
  const [state, formAction, isPending] = useActionState(
    submitInquiry,
    initialState,
  );

  if (state.success) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-brand-dark">
          문의가 접수되었습니다.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          입력해주신 연락처로 순차적으로 답변드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
        이름
        <input
          name="name"
          required
          placeholder="예: 홍길동"
          className="rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
        전화번호
        <input
          name="phone"
          type="tel"
          required
          placeholder="010-0000-0000"
          className="rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
        문의 내용
        <textarea
          name="message"
          required
          rows={5}
          placeholder="궁금하신 내용을 남겨주세요."
          className="rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "접수 중..." : "문의 남기기"}
      </button>
    </form>
  );
}
