"use client";

import { useActionState, useRef, useEffect } from "react";
import { askQuestion, deleteQuestion, type AskQuestionState } from "./qna-actions";
import DeleteQuestionButton from "@/components/qna/DeleteQuestionButton";

interface QuestionItem {
  id: string;
  content: string;
  answer: string | null;
  createdAt: string;
}

const initialState: AskQuestionState = {};

export default function QnaSection({
  lessonId,
  questions,
}: {
  lessonId: string;
  questions: QuestionItem[];
}) {
  const boundAskQuestion = askQuestion.bind(null, lessonId);
  const [state, formAction, isPending] = useActionState(
    boundAskQuestion,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-200 pt-6">
      <div>
        <p className="text-sm font-semibold text-zinc-700">질문하기</p>
        <p className="text-xs text-zinc-400">
          여기 남긴 질문은 나와 선생님만 볼 수 있어요.
        </p>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <textarea
          name="content"
          required
          rows={3}
          placeholder="이 강의에 대해 궁금한 점을 남겨주세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "등록 중..." : "질문 등록"}
        </button>
      </form>

      {questions.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-700">내 질문 목록</p>
          {questions.map((question) => (
            <div
              key={question.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-900">{question.content}</p>
                <DeleteQuestionButton
                  action={deleteQuestion.bind(null, question.id, lessonId)}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {question.createdAt}
              </p>
              {question.answer ? (
                <div className="mt-3 rounded-md bg-brand-light p-3">
                  <p className="text-xs font-semibold text-brand-dark">
                    선생님 답변
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {question.answer}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-400">
                  아직 답변이 등록되지 않았습니다.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
