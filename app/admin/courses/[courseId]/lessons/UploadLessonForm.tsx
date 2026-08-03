"use client";

import { useState } from "react";
import { createDirectUpload, saveLesson } from "./actions";

export default function UploadLessonForm({
  courseId,
  existingSections,
}: {
  courseId: string;
  existingSections: string[];
}) {
  const [title, setTitle] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionSubtitle, setSectionSubtitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !file) {
      setError("차시 제목과 영상 파일을 선택해주세요.");
      return;
    }

    setError(null);
    setStatus("uploading");
    setProgress(0);

    try {
      const { uploadUrl, uploadId } = await createDirectUpload(courseId);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status < 300 ? resolve() : reject(new Error("업로드에 실패했습니다."));
        xhr.onerror = () => reject(new Error("업로드에 실패했습니다."));
        xhr.send(file);
      });

      setStatus("saving");
      await saveLesson(
        courseId,
        title.trim(),
        uploadId,
        sectionTitle.trim(),
        sectionSubtitle.trim(),
      );

      setTitle("");
      setSectionTitle("");
      setSectionSubtitle("");
      setFile(null);
      setStatus("idle");
      setProgress(0);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.",
      );
      setStatus("idle");
    }
  }

  const isBusy = status !== "idle";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        차시 제목
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 1강 - 문법 정리"
          disabled={isBusy}
          className="min-w-[14rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand disabled:bg-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        섹션명 (선택)
        <input
          value={sectionTitle}
          onChange={(e) => setSectionTitle(e.target.value)}
          placeholder="예: 1단원 - 문법"
          list="section-title-options"
          disabled={isBusy}
          className="min-w-[10rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand disabled:bg-zinc-50"
        />
        <datalist id="section-title-options">
          {existingSections.map((section) => (
            <option key={section} value={section} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        섹션 부제 (선택)
        <input
          value={sectionSubtitle}
          onChange={(e) => setSectionSubtitle(e.target.value)}
          placeholder="예: 출판사-EBS"
          disabled={isBusy}
          className="min-w-[10rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand disabled:bg-zinc-50"
        />
      </label>
      <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        영상 파일
        <label
          className={
            "flex w-fit items-center gap-2 " +
            (isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer")
          }
        >
          <span className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark">
            파일 선택
          </span>
          <span className="max-w-[12rem] truncate text-sm text-zinc-500">
            {file ? file.name : "선택된 파일 없음"}
          </span>
          <input
            type="file"
            accept="video/*"
            disabled={isBusy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={isBusy}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {status === "uploading"
          ? `업로드 중... ${progress}%`
          : status === "saving"
            ? "저장 중..."
            : "영상 업로드"}
      </button>

      {error && (
        <p className="w-full text-sm font-medium text-red-500">{error}</p>
      )}
    </form>
  );
}
