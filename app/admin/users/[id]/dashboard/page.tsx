import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhone } from "@/lib/formatPhone";
import { scoreToPercent } from "@/lib/scoreParsing";
import GaugeCard from "@/components/admin/charts/GaugeCard";
import DonutChart from "@/components/admin/charts/DonutChart";
import CategoryTrendChart from "./CategoryTrendChart";
import LatestScoreBarChart from "./LatestScoreBarChart";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

interface CategoryData {
  id: string;
  slug: string;
  label: string;
  max_score: number;
}

interface ReportData {
  id: string;
  report_type: string;
  title: string;
  score: string;
  exam_date: string | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: user }, { data: categories }, { data: reports }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, phone, school, grade")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("score_report_categories")
        .select("id, slug, label, max_score")
        .order("sort_order", { ascending: true })
        .returns<CategoryData[]>(),
      supabase
        .from("score_reports")
        .select("id, report_type, title, score, exam_date")
        .eq("profile_id", id)
        .order("exam_date", { ascending: true })
        .returns<ReportData[]>(),
    ]);

  if (!user) notFound();

  const categoryList = categories ?? [];
  const reportList = reports ?? [];
  const categoryBySlug = new Map(categoryList.map((c) => [c.slug, c]));

  interface EnrichedRow {
    id: string;
    title: string;
    categoryLabel: string;
    categorySlug: string;
    score: string;
    percent: number | null;
    examDate: string | null;
  }

  const enriched: EnrichedRow[] = reportList.map((r) => {
    const category = categoryBySlug.get(r.report_type);
    const percent = category
      ? scoreToPercent(r.score, category.max_score)
      : null;
    return {
      id: r.id,
      title: r.title,
      categoryLabel: category?.label ?? r.report_type,
      categorySlug: r.report_type,
      score: r.score,
      percent,
      examDate: r.exam_date,
    };
  });

  // 게이지: 이 학생이 실제로 응시한 카테고리만, 만점 대비 평균 백분율.
  const gaugeData = categoryList
    .map((category) => {
      const percents = enriched
        .filter(
          (row) => row.categorySlug === category.slug && row.percent !== null,
        )
        .map((row) => row.percent as number);
      const average = percents.length
        ? percents.reduce((a, b) => a + b, 0) / percents.length
        : null;
      return { label: category.label, average, sampleCount: percents.length };
    })
    .filter((gauge) => gauge.sampleCount > 0);

  // 도넛: 카테고리별 응시 횟수 비율.
  const countByCategory = new Map<string, number>();
  for (const row of enriched) {
    countByCategory.set(
      row.categoryLabel,
      (countByCategory.get(row.categoryLabel) ?? 0) + 1,
    );
  }
  const donutData = [...countByCategory.entries()].map(([label, count]) => ({
    label,
    count,
  }));

  // 추이: 학교 전체 대시보드와 달리 학생 한 명 기준이라 월별로 뭉개지 않고
  // 회차 하나하나를 그대로 점으로 찍는다. 카테고리별로 선을 나눈다.
  const dateMap = new Map<string, Record<string, number>>();
  for (const row of enriched) {
    if (row.percent === null || !row.examDate) continue;
    const bucket = dateMap.get(row.examDate) ?? {};
    bucket[row.categoryLabel] = Math.round(row.percent * 10) / 10;
    dateMap.set(row.examDate, bucket);
  }
  const trendData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));
  const categoryLabelsWithData = [
    ...new Set(enriched.filter((r) => r.percent !== null).map((r) => r.categoryLabel)),
  ];

  // 막대: 카테고리별 가장 최근 응시 점수 (게이지의 "평균"과 달리 "지금"을 보여준다).
  const latestByCategory = new Map<string, number>();
  for (const row of enriched) {
    if (row.percent === null) continue;
    latestByCategory.set(row.categoryLabel, row.percent); // 오름차순 정렬이라 마지막 값이 최신
  }
  const latestBarData = [...latestByCategory.entries()].map(
    ([label, percent]) => ({ label, percent: Math.round(percent * 10) / 10 }),
  );

  const tableRows = [...enriched].sort((a, b) =>
    (b.examDate ?? "").localeCompare(a.examDate ?? ""),
  );

  return (
    <div className="flex flex-1 flex-col p-8">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <Link
          href={`/admin/users/${id}`}
          className="inline-flex w-fit items-center gap-0.5 text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {user.name} 회원 정보
        </Link>
        <PrintButton fileName={`${user.name} 성적 대시보드`} />
      </div>

      <h1 className="mt-1 text-2xl font-bold text-zinc-900">
        {user.name} 성적 대시보드
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        {[user.school, user.grade, formatPhone(user.phone)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        숫자로 입력된 점수만 집계합니다. 등급 텍스트로 입력된 성적은 아래
        전체 목록 표에서만 원문 그대로 확인할 수 있습니다.
      </p>

      {gaugeData.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gaugeData.map((gauge) => (
            <GaugeCard
              key={gauge.label}
              label={gauge.label}
              average={gauge.average}
              sampleCount={gauge.sampleCount}
            />
          ))}
        </div>
      )}

      {gaugeData.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          등록된 성적이 없습니다.
        </p>
      )}

      {gaugeData.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-1">
              <h2 className="text-sm font-bold text-zinc-900">
                카테고리별 응시 비율
              </h2>
              <DonutChart data={donutData} />
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
              <h2 className="text-sm font-bold text-zinc-900">
                카테고리별 점수 추이
              </h2>
              <CategoryTrendChart
                data={trendData}
                categoryLabels={categoryLabelsWithData}
              />
            </section>
          </div>

          <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-bold text-zinc-900">
              카테고리별 최근 점수
            </h2>
            <LatestScoreBarChart data={latestBarData} />
          </section>
        </>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-bold text-zinc-900">전체 성적 목록</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
              <tr>
                <th className="px-4 py-3">카테고리</th>
                <th className="px-4 py-3">시험명</th>
                <th className="px-4 py-3">점수</th>
                <th className="px-4 py-3">시험일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tableRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-zinc-500">
                    {row.categoryLabel}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.title}</td>
                  <td className="px-4 py-3 font-semibold text-brand-dark">
                    {row.score}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {row.examDate ?? "-"}
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-400"
                  >
                    등록된 리포트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
