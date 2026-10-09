"use client";

import { useTransition } from "react";
import { deleteWritingSet, setWritingSetHidden } from "@/app/(main)/mypage/teaching/[courseId]/writing/actions";

export function WritingSetHideButton({
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
      onClick={() => startTransition(() => setWritingSetHidden(setId, courseId, !hidden))}
      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline disabled:opacity-60"
    >
      {hidden ? "공개 전환" : "숨김"}
    </button>
  );
}

export function WritingSetDeleteButton({ setId, courseId }: { setId: string; courseId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("이 서술형 세트를 삭제할까요? 문장도 함께 삭제됩니다.")) return;
        startTransition(() => deleteWritingSet(setId, courseId));
      }}
      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
    >
      삭제
    </button>
  );
}
