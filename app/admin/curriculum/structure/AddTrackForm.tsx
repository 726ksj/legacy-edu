"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTrack, type StructureActionState } from "./actions";

const initialState: StructureActionState = {};

export default function AddTrackForm({
  schoolLevelId,
}: {
  schoolLevelId: string;
}) {
  const createWithLevel = createTrack.bind(null, schoolLevelId);
  const [state, formAction, isPending] = useActionState(
    createWithLevel,
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
      className="flex flex-wrap items-end gap-3"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        트랙 이름
        <input
          name="title"
          required
          placeholder="예: 예비 고등"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        슬러그 (URL)
        <input
          name="slug"
          required
          placeholder="예: prep"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "추가 중..." : "트랙 추가"}
      </button>
      {state.error && (
        <p className="w-full text-xs font-medium text-red-500">{state.error}</p>
      )}
    </form>
  );
}
