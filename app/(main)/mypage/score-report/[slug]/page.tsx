import { notFound } from "next/navigation";
import { getScoreReportCategories } from "@/lib/scoreReports";
import ScoreReportList from "@/components/score-report/ScoreReportList";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getScoreReportCategories();
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  return (
    <ScoreReportList
      reportType={category.slug}
      title={category.label}
      description={category.description ?? ""}
      extraFieldLabels={category.extra_field_labels}
    />
  );
}
