"use client";

import { useActionState, useRef, useEffect } from "react";
import { createPopup, type PopupFormState } from "./actions";

const initialState: PopupFormState = {};

export default function PopupForm() {
  const [state, formAction, isPending] = useActionState(
    createPopup,
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
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        제목 (팝업 상단에 표시됩니다)
        <input
          name="title"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이미지 (선택)
        <input
          name="image"
          type="file"
          accept="image/*"
          className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:border-brand hover:file:text-brand-dark"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        본문 (선택)
        <textarea
          name="body"
          rows={3}
          placeholder="이미지 아래에 표시할 안내 문구"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        클릭 시 이동할 링크 (선택)
        <input
          name="linkUrl"
          placeholder="예: /notice/xxxx 또는 https://..."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input name="isActive" type="checkbox" className="h-4 w-4 accent-brand" />
        홈페이지에 노출
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">등록되었습니다.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "등록 중..." : "팝업 등록"}
      </button>
    </form>
  );
}
