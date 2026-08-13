"use client";

import { useActionState } from "react";
import { updateSiteContent, type SiteContentState } from "./actions";
import type { SiteContentMap } from "./keys";

const initialState: SiteContentState = {};

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export default function SiteContentForm({
  content,
}: {
  content: SiteContentMap;
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
          대표 인사말 (본문)
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

      <div className="flex flex-col gap-4 border-t border-zinc-100 pt-6">
        <p className="text-sm font-semibold text-zinc-900">
          영어 커리큘럼 (LEGACY ACADEMIC SYSTEM)
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          소개 문구
          <textarea
            name="curriculum_intro"
            defaultValue={content.curriculum_intro}
            required
            rows={2}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>

        {STEP_NUMBERS.map((n) => (
          <div
            key={n}
            className="grid grid-cols-1 gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-4 sm:grid-cols-2"
          >
            <p className="text-xs font-semibold text-zinc-500 sm:col-span-2">
              {n}단계
            </p>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
              제목
              <input
                name={`curriculum_step${n}_title`}
                defaultValue={content[`curriculum_step${n}_title`]}
                required
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
              부제
              <input
                name={`curriculum_step${n}_subtitle`}
                defaultValue={content[`curriculum_step${n}_subtitle`]}
                required
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
              설명
              <textarea
                name={`curriculum_step${n}_desc`}
                defaultValue={content[`curriculum_step${n}_desc`]}
                required
                rows={2}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </label>
          </div>
        ))}
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
