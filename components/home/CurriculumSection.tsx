"use client";

import { useEffect, useRef, useState } from "react";
import { STEP_ICONS } from "./CurriculumIcons";

export interface CurriculumStep {
  no: string;
  title: string;
  subtitle: string;
  description: string;
}

function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function StepCard({ step, index }: { step: CurriculumStep; index: number }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const Icon = STEP_ICONS[index] ?? STEP_ICONS[0];

  return (
    <div
      ref={ref}
      className={`relative mx-auto flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl border border-zinc-100 bg-white px-8 py-12 text-center shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      }`}
    >
      <span className="absolute left-6 top-6 text-3xl font-extrabold text-brand-light">
        {step.no}
      </span>
      <Icon />
      <p className="mt-8 text-sm font-extrabold tracking-wide text-zinc-900">
        {step.title}
      </p>
      <p className="mt-2 text-xl font-bold text-zinc-900">{step.subtitle}</p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
        {step.description}
      </p>
    </div>
  );
}

function FinalBadge() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`relative mx-auto flex w-full max-w-sm flex-col items-center rounded-3xl border border-zinc-100 bg-white px-8 py-14 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      }`}
    >
      <span className="absolute left-6 top-6 text-3xl font-extrabold text-brand-light">
        07
      </span>
      <div className="flex h-52 w-52 flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-b from-brand to-brand-dark text-white shadow-lg">
        <span className="text-xs font-bold tracking-wide">LEGACY</span>
        <span className="text-2xl font-extrabold">성적 향상</span>
        <span className="text-xs font-semibold tracking-wide text-white/80">
          ACADEMIC SYSTEM
        </span>
      </div>
    </div>
  );
}

export default function CurriculumSection({
  intro,
  steps,
}: {
  intro: string;
  steps: CurriculumStep[];
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <span className="text-sm font-semibold text-brand-dark">
          LEGACY ACADEMIC SYSTEM
        </span>
        <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          영어 커리큘럼
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-500">{intro}</p>
      </div>

      <div className="mt-12 flex flex-col gap-8 sm:gap-10">
        {steps.map((step, i) => (
          <StepCard key={step.no} step={step} index={i} />
        ))}
        <FinalBadge />
      </div>
    </section>
  );
}
