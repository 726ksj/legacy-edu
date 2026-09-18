"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { uploadVocabSet, type UploadVocabSetState } from "./actions";

const initialState: UploadVocabSetState = {};

export default function UploadVocabSetForm({ courseId }: { courseId: string }) {
  const uploadWithCourseId = uploadVocabSet.bind(null, courseId);
  const [state, formAction, isPending] = useActionState(
    uploadWithCourseId,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (state.successCount === undefined) return;
    // setState를 effect 본문에서 곧바로(동기적으로) 호출하지 않도록
    // 매크로태스크로 한 틱 미룬다.
    const id = setTimeout(() => {
      formRef.current?.reset();
      setFileName("");
    }, 0);
    return () => clearTimeout(id);
  }, [state.successCount]);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          단어장 제목 (예: 1단원 필수 단어)
          <input
            name="title"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          설명 (선택)
          <input
            name="description"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          엑셀 파일
          <span className="text-xs font-normal text-zinc-400">
            첫 행은 열 제목: 단어, 뜻, 예문(선택)
          </span>
          <div className="flex items-center gap-2">
            <label
              htmlFor="vocab-upload-file"
              className="w-fit cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
            >
              파일 선택
            </label>
            <span className="max-w-[16rem] truncate text-sm text-zinc-500">
              {fileName || "선택된 파일 없음"}
            </span>
          </div>
          <input
            id="vocab-upload-file"
            name="file"
            type="file"
            accept=".xlsx,.xls"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="hidden"
          />
        </div>

        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "업로드 중..." : "단어장 업로드"}
        </button>
      </form>

      {state.successCount !== undefined && (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-brand/25 bg-brand-light/40 p-4">
          <p className="text-sm font-semibold text-brand-dark">
            단어 {state.successCount}개 등록 · 실패 {state.failed?.length ?? 0}건
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
                  {row.word || "(단어 없음)"} — {row.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
