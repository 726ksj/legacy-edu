import { Suspense } from "react";
import ScoreReportList from "@/components/score-report/ScoreReportList";
import PageLoading from "@/components/layout/PageLoading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ScoreReportList
        reportType="official_mock_exam"
        title="교육청/평가원 모의고사 리포트"
        description="교육청 및 평가원 모의고사 성적 리포트입니다."
      />
    </Suspense>
  );
}
