"use client";

import { useActionState } from "react";
import { updateSiteContent, type SiteContentState } from "./actions";

const initialState: SiteContentState = {};

interface SiteContentData {
  hero_heading: string;
  hero_subtitle: string;
  about_body: string;
}

export default function SiteContentForm({
  content,
}: {
  content: SiteContentData;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSiteContent,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-zinc-900">
          홈 화면 히어로 문구
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          제목
          <input
            name="hero_heading"
            defaultValue={content.hero_heading}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          소개 문구
          <textarea
            name="hero_subtitle"
            defaultValue={content.hero_subtitle}
            required
            rows={2}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-6 text-sm font-medium text-zinc-700">
        <p className="text-sm font-semibold text-zinc-900">
          LEGACY를 소개합니다 (본문)
        </p>
        <textarea
          name="about_body"
          defaultValue={content.about_body}
          required
          rows={12}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        <p className="text-xs font-normal text-zinc-400">
          빈 줄로 문단을 구분해주세요.
        </p>
      </div>

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
