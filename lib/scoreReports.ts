export const REPORT_TYPES = [
  "vocabulary",
  "academy_mock_exam",
  "official_mock_exam",
  "midterm_final",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  vocabulary: "단어 테스트 성적",
  academy_mock_exam: "학원 모의고사",
  official_mock_exam: "모의고사",
  midterm_final: "중간/기말고사",
};
