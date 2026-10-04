"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import {
  updateNotice,
  deleteNoticeAttachment,
  type NoticeFormState,
} from "../actions";
import DeleteAttachmentButton from "./DeleteAttachmentButton";

const initialState: NoticeFormState = {};

interface NoticeData {
  id: string;
  category: string;
  title: string;
  content: string;
  visibility: string;
}

interface AttachmentData {
  id: string;
  file_name: string;
  file_url: string;
}

export default function EditNoticeForm({
  notice,
  attachments,
}: {
  notice: NoticeData;
  attachments: AttachmentData[];
}) {
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
        공개 범위
        <select
          name="visibility"
          defaultValue={notice.visibility}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="members">회원공개 (로그인해야 볼 수 있음)</option>
          <option value="public">전체공개 (비회원도 볼 수 있음)</option>
        </select>
      </label>
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

      {attachments.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          첨부된 파일
          <ul className="flex flex-col gap-1.5">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm font-normal text-zinc-600"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">{attachment.file_name}</span>
                </span>
                <DeleteAttachmentButton
                  action={deleteNoticeAttachment.bind(
                    null,
                    attachment.id,
                    notice.id,
                  )}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        첨부파일 추가 (선택, 여러 개 가능)
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
