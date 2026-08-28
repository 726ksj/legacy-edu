import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { scoreToPercent } from "@/lib/scoreParsing";
import GaugeCard from "@/components/admin/charts/GaugeCard";
import DonutChart from "@/components/admin/charts/DonutChart";
import ScoreTrendChart from "./ScoreTrendChart";
import GradeCategoryBarChart from "./GradeCategoryBarChart";
import StudentDetailsTable, {
  type StudentDetailRow,
} from "./StudentDetailsTable";

export const dynamic = "force-dynamic";

const GRADE_ORDER = ["중1", "중2", "중3", "고1", "고2", "고3"];

function gradeSortIndex(grade: string) {
  const index = GRADE_ORDER.indexOf(grade);
  return index === -1 ? GRADE_ORDER.length : index;
}

interface CategoryData {
  id: string;
  slug: string;
  label: string;
  max_score: number;
}

interface ReportData {
  id: string;
  report_type: string;
  score: string;
  exam_date: string | null;
  profile_id: string;
  profiles: { name: string; grade: string | null } | null;
}

export default async function Page() {
  const supabase = createAdminClient();

  const [{ data: categories }, reportList] = await Promise.all([
    supabase
      .from("score_report_categories")
      .select("id, slug, label, max_score")
      .order("sort_order", { ascending: true })
      .returns<CategoryData[]>(),
    fetchAllRows<ReportData>((from, to) =>
      supabase
        .from("score_reports")
        .select(
          "id, report_type, score, exam_date, profile_id, profiles(name, grade)",
        )
        .order("exam_date", { ascending: false })
        .range(from, to)
        .returns<ReportData[]>(),
    ),
  ]);

  const categoryList = categories ?? [];
  const categoryBySlug = new Map(categoryList.map((c) => [c.slug, c]));

  interface EnrichedRow {
    id: string;
    studentName: string;
    grade: string;
    categoryLabel: string;
    categorySlug: string;
    score: string;
    percent: number | null;
    examDate: string | null;
    profileId: string;
  }

  const enriched: EnrichedRow[] = reportList.map((r) => {
    const category = categoryBySlug.get(r.report_type);
    const percent = category
      ? scoreToPercent(r.score, category.max_score)
      : null;
    return {
      id: r.id,
      studentName: r.profiles?.name ?? "-",
      grade: r.profiles?.grade || "미입력",
      categoryLabel: category?.label ?? r.report_type,
      categorySlug: r.report_type,
      score: r.score,
      percent,
      examDate: r.exam_date,
      profileId: r.profile_id,
    };
  });

  // 게이지: 카테고리별 평균 (숫자로 해석되는 점수만, 만점 대비 백분율)
  const gaugeData = categoryList.map((category) => {
    const percents = enriched
      .filter(
        (row) => row.categorySlug === category.slug && row.percent !== null,
      )
      .map((row) => row.percent as number);
    const average = percents.length
      ? percents.reduce((a, b) => a + b, 0) / percents.length
      : null;
    return { label: category.label, average, sampleCount: percents.length };
  });

  // 도넛: 성적이 하나라도 있는 학생을 학년별로 분포
  const studentGradeById = new Map<string, string>();
  for (const row of enriched) {
    if (!studentGradeById.has(row.profileId)) {
      studentGradeById.set(row.profileId, row.grade);
    }
  }
  const gradeCounts = new Map<string, number>();
  for (const grade of studentGradeById.values()) {
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
  }
  const donutData = [...gradeCounts.entries()]
    .sort((a, b) => gradeSortIndex(a[0]) - gradeSortIndex(b[0]))
    .map(([grade, count]) => ({ label: grade, count }));

  // 추이: 월별 전체 평균 (카테고리 만점 기준 백분율로 정규화해 통합)
  const monthBuckets = new Map<string, { sum: number; count: number }>();
  for (const row of enriched) {
    if (row.percent === null || !row.examDate) continue;
    const month = row.examDate.slice(0, 7);
    const bucket = monthBuckets.get(month) ?? { sum: 0, count: 0 };
    bucket.sum += row.percent;
    bucket.count += 1;
    monthBuckets.set(month, bucket);
  }
  const trendData = [...monthBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { sum, count }]) => ({
      month,
      average: Math.round((sum / count) * 10) / 10,
    }));

  // 막대: 학년 x 카테고리 평균 (백분율). 개수가 아닌 평균이라 스택이 아닌
  // 그룹형 막대로 비교한다.
  const cellMap = new Map<string, { sum: number; count: number }>();
  for (const row of enriched) {
    if (row.percent === null) continue;
    const key = `${row.grade}|${row.categoryLabel}`;
    const bucket = cellMap.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += row.percent;
    bucket.count += 1;
    cellMap.set(key, bucket);
  }
  const grades = [...new Set(enriched.map((row) => row.grade))].sort(
    (a, b) => gradeSortIndex(a) - gradeSortIndex(b),
  );
  const categoryLabels = categoryList.map((c) => c.label);
  const barData = grades.map((grade) => {
    const row: Record<string, string | number> = { grade };
    for (const label of categoryLabels) {
      const bucket = cellMap.get(`${grade}|${label}`);
      row[label] = bucket ? Math.round((bucket.sum / bucket.count) * 10) / 10 : 0;
    }
    return row;
  });

  const tableRows: StudentDetailRow[] = enriched.map((row) => ({
    id: row.id,
    studentName: row.studentName,
    grade: row.grade,
    categoryLabel: row.categoryLabel,
    score: row.score,
    examDate: row.examDate,
  }));

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/score-report-categories"
        className="inline-flex w-fit items-center gap-0.5 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        성적 관리
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900">성적 대시보드</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        숫자로 입력된 점수만 집계합니다. "A+"처럼 등급으로 입력된 성적은
        게이지·추이·막대 그래프에서는 제외되고, 아래 전체 목록 표에서만
        원문 그대로 확인할 수 있습니다.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {gaugeData.map((gauge) => (
          <GaugeCard
            key={gauge.label}
            label={gauge.label}
            average={gauge.average}
            sampleCount={gauge.sampleCount}
          />
        ))}
        {gaugeData.length === 0 && (
          <p className="col-span-full text-sm text-zinc-400">
            등록된 카테고리가 없습니다.
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-1">
          <h2 className="text-sm font-bold text-zinc-900">
            학년별 학생 분포
          </h2>
          <DonutChart data={donutData} unit="명" />
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-bold text-zinc-900">
            월별 평균 점수 추이
          </h2>
          <ScoreTrendChart data={trendData} />
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-bold text-zinc-900">
          학년 × 카테고리 평균 점수
        </h2>
        <GradeCategoryBarChart data={barData} categoryLabels={categoryLabels} />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-zinc-900">전체 성적 목록</h2>
        <div className="mt-3">
          <StudentDetailsTable rows={tableRows} />
        </div>
      </section>
    </div>
  );
}
