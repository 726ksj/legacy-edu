"use client";

import { useState } from "react";
import { createDirectUpload, replaceLessonVideo } from "./actions";

export default function ReplaceLessonVideoForm({
  lessonId,
  courseId,
  currentFileName,
}: {
  lessonId: string;
  courseId: string;
  currentFileName: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isBusy = status !== "idle";

  async function handleReplace() {
    if (!file) {
      setError("교체할 영상 파일을 선택해주세요.");
      return;
    }

    setError(null);
    setStatus("uploading");
    setProgress(0);

    try {
      const uploadResult = await createDirectUpload(courseId);
      if ("error" in uploadResult) {
        setError(uploadResult.error);
        setStatus("idle");
        return;
      }
      const { uploadUrl, uploadId } = uploadResult;

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
      const result = await replaceLessonVideo(
        lessonId,
        courseId,
        uploadId,
        file.name,
      );
      if (result.error) {
        setError(result.error);
        setStatus("idle");
        return;
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.",
      );
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
      영상 파일
      <div className="flex items-center gap-2">
        <label
          className={
            "flex w-fit items-center gap-2 " +
            (isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer")
          }
        >
          <span className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark">
            파일 선택
          </span>
          <span className="max-w-[10rem] truncate text-xs font-normal text-zinc-500">
            {file ? file.name : (currentFileName ?? "파일 없음")}
          </span>
          <input
            type="file"
            accept="video/*"
            disabled={isBusy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        {file && (
          <button
            type="button"
            onClick={handleReplace}
            disabled={isBusy}
            className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {status === "uploading"
              ? `업로드 중... ${progress}%`
              : status === "saving"
                ? "교체 중..."
                : "영상 교체"}
          </button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
