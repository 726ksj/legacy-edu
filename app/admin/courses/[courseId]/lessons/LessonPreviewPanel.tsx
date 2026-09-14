"use client";

import { useEffect, useState } from "react";
import VideoPlayer from "@/app/(main)/watch/[lessonId]/VideoPlayer";
import { getLessonPreview } from "./actions";

interface PreviewData {
  playbackId: string;
  token: string;
  src?: string;
  title: string;
}

export default function LessonPreviewPanel({
  lessonId,
  courseId,
}: {
  lessonId: string;
  courseId: string;
}) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLessonPreview(lessonId, courseId).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
      } else {
        setData(result);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId, courseId]);

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">불러오는 중...</p>
    );
  }
  if (error) {
    return <p className="py-6 text-center text-sm text-red-500">{error}</p>;
  }
  if (!data) return null;

  return (
    <div className="max-w-2xl py-2">
      <VideoPlayer
        playbackId={data.playbackId}
        token={data.token}
        src={data.src}
        title={data.title}
        lessonId={lessonId}
      />
    </div>
  );
}
