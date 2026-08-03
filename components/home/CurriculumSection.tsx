"use client";

import { useEffect, useRef, useState } from "react";

export interface CurriculumStep {
  no: string;
  title: string;
  subtitle: string;
  description: string;
}

function StepRow({ step, index }: { step: CurriculumStep; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-3 border-t border-zinc-200 py-10 transition-all duration-700 ease-out sm:flex-row sm:items-start sm:gap-8 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
      style={{ transitionDelay: visible ? `${index * 80}ms` : "0ms" }}
    >
      <span className="shrink-0 text-5xl font-extrabold text-brand-dark/20 sm:text-6xl">
        {step.no}
      </span>
      <div>
        <p className="text-lg font-bold text-zinc-900 sm:text-xl">
          {step.title}
          <span className="ml-2 text-sm font-normal text-zinc-400">
            · {step.subtitle}
          </span>
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
          {step.description}
        </p>
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
      <div>
        <span className="text-sm font-semibold text-brand-dark">
          LEGACY ACADEMIC SYSTEM
        </span>
        <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          영어 커리큘럼
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-500">{intro}</p>
      </div>

      <div className="mt-6">
        {steps.map((step, i) => (
          <StepRow key={step.no} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
