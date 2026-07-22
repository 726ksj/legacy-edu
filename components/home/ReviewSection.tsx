"use client";

import { useState } from "react";
import { Camera, Play, Rss, X } from "lucide-react";

interface Review {
  id: number;
  name: string;
  school: string;
  subject: string;
  summary: string;
  detail: string;
}

const REVIEWS: Review[] = [
  {
    id: 1,
    name: "박*준",
    school: "분당고",
    subject: "수학",
    summary: "내신 수학 2등급 → 1등급으로 올랐어요!",
    detail:
      "선생님이 개념부터 꼼꼼하게 잡아주셔서 시험 범위 안에서 흔들리지 않고 문제를 풀 수 있었습니다. 특히 오답노트 관리가 큰 도움이 됐어요.",
  },
  {
    id: 2,
    name: "이*연",
    school: "서현고",
    subject: "영어",
    summary: "내신 영어 등급이 3등급이나 상승했어요.",
    detail:
      "지문 분석 방식이 학교 시험 스타일과 정확히 맞아서 시험장에서 자신감 있게 풀 수 있었습니다.",
  },
  {
    id: 3,
    name: "김*호",
    school: "수지고",
    subject: "국어",
    summary: "수능 국어 1등급을 처음 받아봤습니다.",
    detail:
      "매주 진행되는 모의고사 첨삭 덕분에 실전 감각을 꾸준히 유지할 수 있었어요.",
  },
  {
    id: 4,
    name: "최*아",
    school: "정자고",
    subject: "수학",
    summary: "꼼꼼한 관리 덕분에 성적이 안정됐어요.",
    detail:
      "매달 상담을 통해 부족한 부분을 바로 짚어주셔서 공부 방향을 잃지 않았습니다.",
  },
  {
    id: 5,
    name: "정*우",
    school: "판교고",
    subject: "과학탐구",
    summary: "내신 과탐 1등급 유지 중입니다.",
    detail:
      "개념 설명이 명확하고, 학교 기출 분석 자료가 실제 시험과 거의 비슷하게 나왔어요.",
  },
  {
    id: 6,
    name: "한*빈",
    school: "동광고",
    subject: "영어",
    summary: "동광고 영어 내신 만점 받았습니다!",
    detail:
      "학교별 맞춤 자료 덕분에 시험 직전까지 효율적으로 마무리할 수 있었습니다.",
  },
  {
    id: 7,
    name: "오*진",
    school: "분당고",
    subject: "사회탐구",
    summary: "암기 과목도 체계적으로 관리해주셨어요.",
    detail:
      "단순 암기가 아니라 흐름으로 이해하는 방식이라 오래 기억에 남았습니다.",
  },
  {
    id: 8,
    name: "장*희",
    school: "낙생고",
    subject: "수학",
    summary: "수능 수학 3등급에서 2등급으로!",
    detail:
      "취약 유형을 데이터로 분석해서 그 부분만 집중적으로 훈련해주셨어요.",
  },
  {
    id: 9,
    name: "윤*서",
    school: "수지고",
    subject: "국어",
    summary: "선생님과의 소통이 정말 편했어요.",
    detail:
      "궁금한 점을 나의 Q&A로 질문하면 빠르게 답변해주셔서 막히는 부분이 없었습니다.",
  },
];

const NOTE_COLORS = [
  "bg-amber-100",
  "bg-rose-100",
  "bg-sky-100",
  "bg-lime-100",
  "bg-violet-100",
];

export default function ReviewSection() {
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

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {REVIEWS.map((review, i) => (
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

      <p className="mt-4 text-xs text-zinc-400">
        * 위 후기는 예시이며, 실제 후기는 추후 업데이트됩니다.
      </p>

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
