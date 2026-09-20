import { getCurriculumIcon } from "./icons";

export interface CurriculumStepData {
  id: string;
  icon: string;
  title: string;
  description: string | null;
}

export interface CurriculumCategoryData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  intro: string | null;
  closing_title: string | null;
  closing_description: string | null;
}

function StepRow({ step, index }: { step: CurriculumStepData; index: number }) {
  const Icon = getCurriculumIcon(step.icon);
  const no = String(index + 1).padStart(2, "0");

  return (
    <div className="flex min-h-32 items-center gap-4 rounded-2xl border border-brand/20 bg-white px-5 py-4 shadow-sm sm:min-h-36 sm:gap-6 sm:px-6 sm:py-5">
      <span className="shrink-0 text-xl font-extrabold text-brand-dark sm:text-2xl">
        {no}
      </span>
      <span className="h-px shrink-0 self-stretch bg-brand/20" />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold text-zinc-900 sm:text-lg">
          {step.title}
        </p>
        {step.description && (
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            {step.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CurriculumCategoryView({
  category,
  steps,
}: {
  category: CurriculumCategoryData;
  steps: CurriculumStepData[];
}) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Curriculum
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {category.title}
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        {category.subtitle && (
          <p className="w-fit rounded-full bg-brand-light px-4 py-1.5 text-sm font-bold text-brand-dark">
            {category.subtitle}
          </p>
        )}
        {category.intro && (
          <p className="text-sm text-zinc-500 sm:text-base">
            {category.intro}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:gap-5">
        {steps.map((step, index) => (
          <StepRow key={step.id} step={step} index={index} />
        ))}
      </div>

      {(category.closing_title || category.closing_description) && (
        <div className="rounded-2xl border-2 border-brand/25 bg-brand-light/40 px-6 py-8 text-center sm:px-10 sm:py-10">
          {category.closing_title && (
            <p className="text-sm font-bold uppercase tracking-wide text-brand-dark sm:text-base">
              {category.closing_title}
            </p>
          )}
          {category.closing_description && (
            <p className="mx-auto mt-3 max-w-xl text-base font-semibold text-zinc-900 sm:text-lg">
              {category.closing_description}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
