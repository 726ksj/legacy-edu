"use client";

import { useTransition } from "react";
import { deleteSentenceSet, setSentenceSetHidden } from "@/app/(main)/mypage/teaching/[courseId]/sentence/actions";

export function SentenceSetHideButton({
  setId,
  courseId,
  hidden,
}: {
  setId: string;
  courseId: string;
  hidden: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setSentenceSetHidden(setId, courseId, !hidden))}
      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline disabled:opacity-60"
    >
      {hidden ? "공개 전환" : "숨김"}
    </button>
  );
}

export function SentenceSetDeleteButton({ setId, courseId }: { setId: string; courseId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("이 문장 배열 세트를 삭제할까요? 문제도 함께 삭제됩니다.")) return;
        startTransition(() => deleteSentenceSet(setId, courseId));
      }}
      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
    >
      삭제
    </button>
  );
}
