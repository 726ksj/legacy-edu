import { BookText, Calculator, FlaskConical, Globe, Landmark } from "lucide-react";

const SUBJECTS = [
  {
    label: "국어",
    icon: BookText,
    description: "준비 중입니다.",
  },
  {
    label: "수학",
    icon: Calculator,
    description: "준비 중입니다.",
  },
  {
    label: "영어",
    icon: Globe,
    description: "학교별 기출 분석 기반 내신 맞춤 커리큘럼",
  },
  {
    label: "사회탐구",
    icon: Landmark,
    description: "준비 중입니다.",
  },
  {
    label: "과학탐구",
    icon: FlaskConical,
    description: "준비 중입니다.",
  },
];

export default function CurriculumSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div>
        <span className="text-sm font-semibold text-brand-dark">
          LEGACY EDU
        </span>
        <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          영어 커리큘럼
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SUBJECTS.map(({ label, icon: Icon, description }) => (
          <div
            key={label}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand-dark">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-zinc-900">{label}</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
