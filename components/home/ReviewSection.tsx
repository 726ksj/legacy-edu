"use client";

import { useState } from "react";
import { Camera, Play, Rss, X } from "lucide-react";

interface Review {
  id: string;
  name: string;
  school: string;
  subject: string;
  summary: string;
  detail: string;
}

const NOTE_COLORS = [
  "bg-amber-100",
  "bg-rose-100",
  "bg-sky-100",
  "bg-lime-100",
  "bg-violet-100",
];

export default function ReviewSection({ reviews }: { reviews: Review[] }) {
  const [selected, setSelected] = useState<Review | null>(null);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-sm font-semibold text-brand-dark">
            LEGACY EDU
          </span>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
            수강생 Review
          </h2>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <a href="#" aria-label="유튜브" className="hover:text-brand-dark">
            <Play className="h-5 w-5" />
          </a>
          <a href="#" aria-label="블로그" className="hover:text-brand-dark">
            <Rss className="h-5 w-5" />
          </a>
          <a href="#" aria-label="인스타그램" className="hover:text-brand-dark">
            <Camera className="h-5 w-5" />
          </a>
        </div>
      </div>

      {reviews.length === 0 && (
        <p className="mt-8 text-sm text-zinc-400">
          아직 등록된 후기가 없습니다.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {reviews.map((review, i) => (
          <div
            key={review.id}
            className={`flex flex-col justify-between rounded-sm p-4 shadow-sm ${NOTE_COLORS[i % NOTE_COLORS.length]}`}
          >
            <div>
              <p className="text-xs font-semibold text-zinc-500">
                {review.name} · {review.school}
              </p>
              <p className="mt-2 text-sm font-medium leading-snug text-zinc-800">
                {review.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(review)}
              className="mt-4 self-start text-xs font-semibold text-zinc-500 underline underline-offset-2 hover:text-brand-dark"
            >
              View
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">
                  {selected.name} · {selected.school} · {selected.subject}
                </p>
                <h3 className="mt-1 text-lg font-bold text-zinc-900">
                  {selected.summary}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="닫기"
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              {selected.detail}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
