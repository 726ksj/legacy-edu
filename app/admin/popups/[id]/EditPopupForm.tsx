"use client";

import { useActionState } from "react";
import Image from "next/image";
import { updatePopup, type PopupFormState } from "../actions";

const initialState: PopupFormState = {};

interface PopupData {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
}

export default function EditPopupForm({ popup }: { popup: PopupData }) {
  const boundUpdatePopup = updatePopup.bind(null, popup.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdatePopup,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        제목 (팝업 상단에 표시됩니다)
        <input
          name="title"
          defaultValue={popup.title}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이미지 (선택 — 새로 올리면 기존 이미지를 대체합니다)
        {popup.image_url && (
          <Image
            src={popup.image_url}
            alt={popup.title}
            width={160}
            height={160}
            className="mb-1 h-40 w-40 rounded-md object-cover"
          />
        )}
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
          defaultValue={popup.body ?? ""}
          rows={3}
          placeholder="이미지 아래에 표시할 안내 문구"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        클릭 시 이동할 링크 (선택)
        <input
          name="linkUrl"
          defaultValue={popup.link_url ?? ""}
          placeholder="예: /notice/xxxx 또는 https://..."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={popup.is_active}
          className="h-4 w-4 accent-brand"
        />
        홈페이지에 노출
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">저장되었습니다.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
