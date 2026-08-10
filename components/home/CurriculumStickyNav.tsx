"use client";

import { useEffect, useState } from "react";
import type { CurriculumStep } from "./CurriculumSection";
import { CURRICULUM_SECTION_ID, curriculumStepId } from "./CurriculumSection";

const HEADER_HEIGHT = 64;

export default function CurriculumStickyNav({
  steps,
}: {
  steps: CurriculumStep[];
}) {
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const section = document.getElementById(CURRICULUM_SECTION_ID);
    if (!section) return;

    function measure() {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      setVisible(rect.top <= HEADER_HEIGHT && rect.bottom > HEADER_HEIGHT);

      let current = 0;
      steps.forEach((_, i) => {
        const stepEl = document.getElementById(curriculumStepId(i));
        if (stepEl && stepEl.getBoundingClientRect().top <= HEADER_HEIGHT + 1) {
          current = i;
        }
      });
      setActiveIndex(current);
    }

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // steps는 최초 렌더 이후 바뀌지 않으므로 마운트 시 1회만 리스너 등록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToStep(index: number) {
    document
      .getElementById(curriculumStepId(index))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white transition-opacity duration-150 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 overflow-x-auto px-4 sm:px-6">
        {steps.map((step, i) => (
          <button
            key={step.no}
            type="button"
            onClick={() => goToStep(i)}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors ${
              i === activeIndex
                ? "border-brand-dark text-brand-dark"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {step.subtitle}
          </button>
        ))}
      </div>
    </div>
  );
}
