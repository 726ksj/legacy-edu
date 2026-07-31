"use client";

import { useActionState } from "react";
import { answerQuestion, type AnswerQuestionState } from "./actions";

const initialState: AnswerQuestionState = {};

export default function AnswerForm({
  questionId,
  existingAnswer,
}: {
  questionId: string;
  existingAnswer: string | null;
}) {
  const boundAnswerQuestion = answerQuestion.bind(null, questionId);
  const [state, formAction, isPending] = useActionState(
    boundAnswerQuestion,
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <textarea
        name="answer"
        required
        rows={2}
        defaultValue={existingAnswer ?? ""}
        placeholder="답변을 입력해주세요."
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
      />
      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">저장되었습니다.</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "저장 중..." : existingAnswer ? "답변 수정" : "답변 등록"}
      </button>
    </form>
  );
}
