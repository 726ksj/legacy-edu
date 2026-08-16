import { Suspense } from "react";
import ScoreReportList from "@/components/score-report/ScoreReportList";
import PageLoading from "@/components/layout/PageLoading";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ScoreReportList
        reportType="vocabulary"
        title="단어 테스트 성적"
        description="단어 테스트 결과 리포트입니다."
      />
    </Suspense>
  );
}
