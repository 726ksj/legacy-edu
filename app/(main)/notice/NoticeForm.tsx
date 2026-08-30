"use client";

import { useActionState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createNotice, type NoticeFormState } from "./actions";

const initialState: NoticeFormState = {};

export default function NoticeForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createNotice,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.replace("/notice");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr]">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          구분
          <select
            name="category"
            defaultValue="공지"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="공지">공지</option>
            <option value="이벤트">이벤트</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          제목
          <input
            name="title"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        내용
        <textarea
          name="content"
          required
          rows={6}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        첨부파일 (선택, 여러 개 가능)
        <input
          name="attachments"
          type="file"
          multiple
          className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:border-brand hover:file:text-brand-dark"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "등록 중..." : "공지 등록"}
        </button>
        <button
          type="button"
          onClick={() => router.replace("/notice")}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-700"
        >
          취소
        </button>
      </div>
    </form>
  );
}
