"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  previewVocabSet,
  registerVocabSet,
  type VocabPreviewState,
} from "./actions";
import { weeksOf } from "@/lib/weeks";
import { REQUIRED_VOCAB_HEADERS, countVocabErrors } from "@/lib/vocabUpload";

const initialState: VocabPreviewState = {};

const INPUT_CLASS =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand";

export default function UploadVocabSetForm({
  courseId,
  defaultWeek = null,
  totalWeeks,
}: {
  courseId: string;
  defaultWeek?: number | null;
  totalWeeks: number;
}) {
  const previewWithCourseId = previewVocabSet.bind(null, courseId);
  const [state, previewAction, isPreviewing] = useActionState(
    previewWithCourseId,
    initialState,
  );
  const [isRegistering, startRegister] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [week, setWeek] = useState(defaultWeek ? String(defaultWeek) : "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");
  // 파일을 다시 고르면 이전 미리보기는 더 이상 유효하지 않으니 숨긴다.
  const [hidePreview, setHidePreview] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);

  const rows = hidePreview ? undefined : state.rows;
  const errorCount = rows ? countVocabErrors(rows) : 0;
  const canRegister =
    rows !== undefined && errorCount === 0 && Boolean(week) && Boolean(title.trim());

  const register = () => {
    if (!rows) return;
    setRegisterError(null);
    startRegister(async () => {
      const result = await registerVocabSet(courseId, {
        title,
        description,
        week: week ? Number(week) : null,
        words: rows,
      });
      if (result.error) {
        setRegisterError(result.error);
        return;
      }
      setRegisteredCount(result.successCount ?? rows.length);
      setHidePreview(true);
      setTitle("");
      setDescription("");
      setFileName("");
      formRef.current?.reset();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={(formData) => {
          setHidePreview(false);
          setRegisteredCount(null);
          setRegisterError(null);
          previewAction(formData);
        }}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            주차
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              required
              className={INPUT_CLASS}
            >
              <option value="" disabled>
                주차 선택
              </option>
              {weeksOf(totalWeeks).map((w) => (
                <option key={w} value={w}>
                  {w}주차
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            단어장 제목 (예: 1단원 필수 단어)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          설명 (선택)
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          엑셀 파일
          <span className="text-xs font-normal text-zinc-400">
            첫 행에 열 제목이 필요합니다: {REQUIRED_VOCAB_HEADERS.join(", ")}{" "}
            (모두 필수)
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
            accept=".xlsx"
            required
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? "");
              setHidePreview(true);
              setRegisteredCount(null);
            }}
            className="hidden"
          />
        </div>

        {state.error && !hidePreview && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPreviewing}
          className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPreviewing ? "확인 중..." : "미리보기"}
        </button>
      </form>

      {registeredCount !== null && (
        <p className="rounded-lg border-2 border-brand/25 bg-brand-light/40 p-4 text-sm font-semibold text-brand-dark">
          단어 {registeredCount}개를 등록했습니다.
        </p>
      )}

      {rows && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-900">
              미리보기{" "}
              <span className="font-normal text-zinc-500">
                · {state.fileName} · 총 {rows.length}행
              </span>
              <span
                className={
                  "ml-2 rounded-md px-2 py-0.5 text-xs font-semibold " +
                  (errorCount > 0
                    ? "bg-red-100 text-red-600"
                    : "bg-brand-light text-brand-dark")
                }
              >
                {errorCount > 0 ? `오류 ${errorCount}건` : "오류 없음"}
              </span>
            </p>
            {errorCount === 0 && (
              <button
                type="button"
                onClick={register}
                disabled={!canRegister || isRegistering}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {isRegistering ? "등록 중..." : `${rows.length}개 단어 등록`}
              </button>
            )}
          </div>

          {errorCount > 0 ? (
            <p className="text-sm text-red-500">
              오류가 있는 행이 있어 등록할 수 없습니다. 엑셀 파일을 수정한 뒤
              다시 선택해 미리보기를 확인하세요.
            </p>
          ) : (
            !canRegister && (
              <p className="text-xs text-zinc-500">
                주차와 단어장 제목을 입력하면 등록할 수 있습니다.
              </p>
            )
          )}
          {registerError && (
            <p className="text-sm font-medium text-red-500">{registerError}</p>
          )}

          <div className="max-h-96 overflow-auto rounded-md border border-zinc-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-xs font-semibold text-zinc-500">
                <tr>
                  <th className="w-14 px-3 py-2">행</th>
                  <th className="px-3 py-2">단어</th>
                  <th className="px-3 py-2">뜻</th>
                  <th className="px-3 py-2">예시 문장</th>
                  <th className="w-48 px-3 py-2">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.row} className={row.error ? "bg-red-50" : ""}>
                    <td className="px-3 py-2 text-zinc-400">{row.row}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {row.word || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {row.meaning || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {row.example || "-"}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-xs font-semibold " +
                        (row.error ? "text-red-600" : "text-brand-dark")
                      }
                    >
                      {row.error ?? "정상"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
