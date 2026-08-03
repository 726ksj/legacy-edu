export interface CurriculumStep {
  no: string;
  title: string;
  subtitle: string;
  description: string;
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

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.no}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-5"
          >
            <span className="text-xs font-bold text-brand-dark">
              {step.no}
            </span>
            <p className="text-sm font-semibold text-zinc-900">
              {step.title}
              <span className="ml-1 font-normal text-zinc-400">
                · {step.subtitle}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
