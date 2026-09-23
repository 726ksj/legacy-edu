import {
  CurriculumStepsList,
  CurriculumClosingBadge,
  type CurriculumCategoryData,
  type CurriculumStepData,
} from "@/components/curriculum/CurriculumCategoryView";

export interface LegacyCurriculumEntry {
  category: CurriculumCategoryData;
  steps: CurriculumStepData[];
}

export default function LegacyCurriculumSection({
  entries,
}: {
  entries: LegacyCurriculumEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <div className="bg-zinc-50">
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div>
          <span className="text-sm font-semibold text-brand-dark">
            LEGACY CURRICULUM
          </span>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl lg:text-4xl">
            레가시 커리큘럼
          </h2>
        </div>

        <div className="mt-12 flex flex-col gap-16">
          {entries.map(({ category, steps }) => (
            <div key={category.id} className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-bold text-zinc-900 sm:text-2xl">
                  {category.title}
                </h3>
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

              <CurriculumStepsList steps={steps} />

              <CurriculumClosingBadge
                title={category.closing_title}
                description={category.closing_description}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
