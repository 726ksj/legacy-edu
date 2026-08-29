import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getScoreReportCategories } from "@/lib/scoreReports";

export const dynamic = "force-dynamic";

export default async function Page() {
  const categories = await getScoreReportCategories();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Score Report
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          성적 리포트
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="max-w-2xl text-sm text-zinc-500">
          영역별 성적 리포트를 확인할 수 있는 페이지입니다.
        </p>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {categories.map((category, index) => (
          <li key={category.id}>
            <Link
              href={`/mypage/score-report/${category.slug}`}
              className="group flex items-center gap-4 rounded-2xl border-2 border-brand/20 bg-white px-5 py-4 transition-all hover:border-brand hover:shadow-[0_8px_28px_-10px_rgba(79,178,139,0.35)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand-dark">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900">
                  {category.label}
                </p>
                {category.description && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {category.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300 transition-colors group-hover:text-brand-dark" />
            </Link>
          </li>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-zinc-400">
            등록된 리포트 카테고리가 없습니다.
          </p>
        )}
      </ul>
    </section>
  );
}
