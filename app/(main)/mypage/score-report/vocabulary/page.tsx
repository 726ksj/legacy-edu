import ScoreReportList from "@/components/score-report/ScoreReportList";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ScoreReportList
      reportType="vocabulary"
      title="단어 테스트 성적"
      description="단어 테스트 결과 리포트입니다."
    />
  );
}
