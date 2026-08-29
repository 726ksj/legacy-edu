"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateNotice, type NoticeFormState } from "../actions";

const initialState: NoticeFormState = {};

interface NoticeData {
  id: string;
  category: string;
  title: string;
  content: string;
}

export default function EditNoticeForm({ notice }: { notice: NoticeData }) {
  const router = useRouter();
  const boundUpdateNotice = updateNotice.bind(null, notice.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdateNotice,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.replace(`/notice/${notice.id}`);
      router.refresh();
    }
  }, [state.success, router, notice.id]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr]">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          구분
          <select
            name="category"
            defaultValue={notice.category}
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
            defaultValue={notice.title}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        내용
        <textarea
          name="content"
          defaultValue={notice.content}
          required
          rows={8}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
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
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => router.replace(`/notice/${notice.id}`)}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-700"
        >
          취소
        </button>
      </div>
    </form>
  );
}
