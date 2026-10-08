"use client";

import { useTransition } from "react";
import { updateVocabSetWeek } from "@/app/admin/vocabulary/[courseId]/actions";
import { WEEKS } from "@/lib/weeks";

export default function VocabSetWeekSelect({
  vocabSetId,
  courseId,
}: {
  vocabSetId: string;
  courseId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue=""
      disabled={isPending}
      aria-label="주차 지정"
      onChange={(e) => {
        const week = Number(e.target.value);
        if (!week) return;
        startTransition(() => updateVocabSetWeek(vocabSetId, courseId, week));
      }}
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 outline-none focus:border-brand disabled:opacity-60"
    >
      <option value="" disabled>
        주차 지정
      </option>
      {WEEKS.map((week) => (
        <option key={week} value={week}>
          {week}주차
        </option>
      ))}
    </select>
  );
}
