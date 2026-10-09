"use client";

import { useTransition } from "react";
import { setVocabSetHidden } from "@/app/admin/vocabulary/[courseId]/actions";

export default function VocabSetHideButton({
  vocabSetId,
  courseId,
  hidden,
}: {
  vocabSetId: string;
  courseId: string;
  hidden: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => setVocabSetHidden(vocabSetId, courseId, !hidden))
      }
      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline disabled:opacity-60"
    >
      {hidden ? "공개 전환" : "숨김"}
    </button>
  );
}
