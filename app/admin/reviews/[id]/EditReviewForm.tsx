"use client";

import { useActionState } from "react";
import { updateReview, type ReviewFormState } from "../actions";

const initialState: ReviewFormState = {};

interface ReviewData {
  id: string;
  name: string;
  school: string;
  subject: string;
  summary: string;
  detail: string;
}

export default function EditReviewForm({ review }: { review: ReviewData }) {
  const boundUpdateReview = updateReview.bind(null, review.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdateReview,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이름 (마스킹 표기)
        <input
          name="name"
          defaultValue={review.name}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학교
        <input
          name="school"
          defaultValue={review.school}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        과목
        <input
          name="subject"
          defaultValue={review.subject}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        한줄 요약
        <input
          name="summary"
          defaultValue={review.summary}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        상세 후기
        <textarea
          name="detail"
          defaultValue={review.detail}
          required
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
