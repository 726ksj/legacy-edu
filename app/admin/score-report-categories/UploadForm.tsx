"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { uploadScoreReports, type UploadState } from "./actions";

const initialState: UploadState = {};

export default function UploadForm({
  categories,
}: {
  categories: { id: string; label: string; extraFieldLabels: string[] }[];
}) {
  const [state, formAction, isPending] = useActionState(
    uploadScoreReports,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [categoryId, setCategoryId] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const requiredHeaders = ["이름", "전화번호", "점수"];
  const headerHint = selectedCategory
    ? [...requiredHeaders, ...selectedCategory.extraFieldLabels].join(", ")
    : requiredHeaders.join(", ");

  useEffect(() => {
    if (state.successCount !== undefined) {
      formRef.current?.reset();
      setCategoryId("");
    }
  }, [state.successCount]);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          카테고리
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="" disabled>
              선택
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          시험명 (예: OO고등학교 2학년 내신반 단어 테스트 - 1회차)
          <input
            name="examTitle"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          시험일 (선택)
          <input
            name="examDate"
            type="date"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          엑셀 파일
          <span className="text-xs font-normal text-zinc-400">
            첫 행은 열 제목: {headerHint} (이름+전화번호로 회원을 찾습니다.)
            {selectedCategory && selectedCategory.extraFieldLabels.length > 0 && (
              <> 추가 필드는 값이 없으면 비워둬도 됩니다.</>
            )}
          </span>
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls"
            required
            className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:border-brand hover:file:text-brand-dark"
          />
        </label>

        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "업로드 중..." : "업로드"}
        </button>
      </form>

      {state.successCount !== undefined && (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-brand/25 bg-brand-light/40 p-4">
          <p className="text-sm font-semibold text-brand-dark">
            성공 {state.successCount}건 · 실패 {state.failed?.length ?? 0}건
          </p>
          {state.failed && state.failed.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {state.failed.map((row) => (
                <li
                  key={row.row}
                  className="rounded-md bg-white px-3 py-2 text-xs text-zinc-600"
                >
                  <span className="font-semibold text-zinc-900">
                    {row.row}행
                  </span>{" "}
                  {row.name || "(이름 없음)"} · {row.phone || "(전화번호 없음)"}{" "}
                  — {row.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
