import { Suspense } from "react";
import ScoreReportList from "@/components/score-report/ScoreReportList";
import PageLoading from "@/components/layout/PageLoading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ScoreReportList
        reportType="academy_mock_exam"
        title="학원 모의고사 리포트"
        description="학원 자체 모의고사 성적 리포트입니다."
      />
    </Suspense>
  );
}
