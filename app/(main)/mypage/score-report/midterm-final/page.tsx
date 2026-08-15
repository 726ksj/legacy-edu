import ScoreReportList from "@/components/score-report/ScoreReportList";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ScoreReportList
      reportType="midterm_final"
      title="중간고사/기말고사 리포트"
      description="학교 중간고사 및 기말고사 성적 리포트입니다."
    />
  );
}
