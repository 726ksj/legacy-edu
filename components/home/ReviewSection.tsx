"use client";

import { useState } from "react";
import { Camera, Play, Quote, Rss, X } from "lucide-react";

interface Review {
  id: string;
  name: string;
  school: string;
  subject: string;
  summary: string;
  detail: string;
}

export default function ReviewSection({ reviews }: { reviews: Review[] }) {
  const [selected, setSelected] = useState<Review | null>(null);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
          >
            <Quote
              className="absolute -right-2 -top-2 h-16 w-16 text-brand-light"
              strokeWidth={1}
            />
            <div className="relative">
              <span className="inline-flex rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark">
                {review.subject}
              </span>
              <p className="mt-4 text-base font-semibold leading-snug text-zinc-900">
                {review.summary}
              </p>
              <p className="mt-3 text-xs font-medium text-zinc-400">
                {review.name} · {review.school}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(review)}
              className="relative mt-5 self-start text-xs font-semibold text-brand-dark transition-colors hover:text-brand-dark/80"
            >
              자세히 보기 →
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 px-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-7 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Quote
              className="absolute -right-3 -top-3 h-20 w-20 text-brand-light"
              strokeWidth={1}
            />
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative">
              <span className="inline-flex rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark">
                {selected.subject}
              </span>
              <h3 className="mt-4 text-lg font-bold leading-snug text-zinc-900">
                {selected.summary}
              </h3>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                {selected.name} · {selected.school}
              </p>
            </div>
            <p className="relative mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
              {selected.detail}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
