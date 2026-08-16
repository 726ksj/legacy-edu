import ScoreReportList from "@/components/score-report/ScoreReportList";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ScoreReportList
      reportType="official_mock_exam"
      title="교육청/평가원 모의고사 리포트"
      description="교육청 및 평가원 모의고사 성적 리포트입니다."
    />
  );
}
