import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseGradeManager } from "@/lib/teachers";
import { getScoreReportCategories } from "@/lib/scoreReports";
import ScoreReportSection, {
  type ScoreReportEntry,
} from "@/components/admin/ScoreReportSection";
import {
  addScoreReport,
  updateScoreReport,
  deleteScoreReport,
} from "./score-actions";

export const dynamic = "force-dynamic";

interface ScoreReportRow {
  id: string;
  report_type: string;
  title: string;
  subject: string | null;
  score: string;
  exam_date: string | null;
  memo: string | null;
  extra_data: Record<string, string> | null;
}

export default async function GradingStudentPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;

  try {
    await requireCourseGradeManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("profile_id, profiles(name, username)")
    .eq("course_id", courseId)
    .eq("profile_id", studentId)
    .maybeSingle<{
      profile_id: string;
      profiles: { name: string; username: string } | null;
    }>();

  if (!enrollment) {
    notFound();
  }

  const [{ data: scoreReports }, categories] = await Promise.all([
    supabase
      .from("score_reports")
      .select(
        "id, report_type, title, subject, score, exam_date, memo, extra_data",
      )
      .eq("profile_id", studentId)
      .order("exam_date", { ascending: false })
      .returns<ScoreReportRow[]>(),
    getScoreReportCategories(),
  ]);

  const scoreReportsByType = new Map<string, ScoreReportEntry[]>();
  for (const row of scoreReports ?? []) {
    const list = scoreReportsByType.get(row.report_type) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      subject: row.subject,
      score: row.score,
      examDate: row.exam_date,
      memo: row.memo,
      extraData: row.extra_data ?? {},
    });
    scoreReportsByType.set(row.report_type, list);
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <Link
          href={`/mypage/grading/${courseId}`}
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← 학생 목록
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {enrollment.profiles?.name} 학생 성적
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((category) => (
          <ScoreReportSection
            key={category.id}
            label={category.label}
            entries={scoreReportsByType.get(category.slug) ?? []}
            extraFieldLabels={category.extra_field_labels}
            addAction={addScoreReport.bind(
              null,
              courseId,
              studentId,
              category.slug,
              category.extra_field_labels,
            )}
            updateAction={updateScoreReport.bind(
              null,
              courseId,
              studentId,
              category.extra_field_labels,
            )}
            deleteAction={deleteScoreReport.bind(null, courseId, studentId)}
          />
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-zinc-400">
            등록된 리포트 카테고리가 없습니다. 관리자에게 문의해주세요.
          </p>
        )}
      </div>
    </section>
  );
}
