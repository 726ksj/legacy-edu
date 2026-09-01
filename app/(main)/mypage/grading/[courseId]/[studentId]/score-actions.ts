"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseGradeManager } from "@/lib/teachers";

export interface ScoreActionState {
  error?: string;
  success?: boolean;
}

function parseScoreForm(formData: FormData, extraFieldLabels: string[]) {
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const score = String(formData.get("score") ?? "").trim();
  const examDate = String(formData.get("examDate") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!title || !score) {
    return { error: "시험명과 점수를 입력해주세요." } as const;
  }

  const extraData: Record<string, string> = {};
  for (const label of extraFieldLabels) {
    const value = String(formData.get(`extra:${label}`) ?? "").trim();
    if (value) extraData[label] = value;
  }

  return {
    title,
    subject: subject || null,
    score,
    exam_date: examDate || null,
    memo: memo || null,
    extra_data: extraData,
  } as const;
}

// 강좌 담당 선생님/조교가 이 강좌에 실제로 수강 중인 학생인지 확인한다 -
// requireCourseGradeManager만으로는 "이 강좌를 관리할 권한"만 확인될 뿐,
// studentId로 아무 프로필이나 넘겨서 성적을 조작하는 걸 막지는 못한다.
async function assertEnrolled(
  supabase: ReturnType<typeof createAdminClient>,
  courseId: string,
  studentId: string,
) {
  const { data } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("profile_id", studentId)
    .maybeSingle();

  if (!data) {
    throw new Error("이 강좌를 수강 중인 학생이 아닙니다.");
  }
}

function revalidateScoreReportPaths(courseId: string, studentId: string) {
  revalidatePath(`/mypage/grading/${courseId}/${studentId}`);
  revalidatePath("/mypage/score-report");
  revalidatePath("/mypage/score-report/[slug]", "layout");
}

export async function addScoreReport(
  courseId: string,
  studentId: string,
  reportType: string,
  extraFieldLabels: string[],
  formData: FormData,
): Promise<ScoreActionState> {
  try {
    await requireCourseGradeManager(courseId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "권한이 없습니다." };
  }
  const parsed = parseScoreForm(formData, extraFieldLabels);
  if ("error" in parsed) return parsed;

  const supabase = createAdminClient();
  try {
    await assertEnrolled(supabase, courseId, studentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "확인 중 오류가 발생했습니다." };
  }

  const { error } = await supabase.from("score_reports").insert({
    profile_id: studentId,
    report_type: reportType,
    ...parsed,
  });

  if (error) return { error: error.message };

  revalidateScoreReportPaths(courseId, studentId);
  return { success: true };
}

export async function updateScoreReport(
  courseId: string,
  studentId: string,
  extraFieldLabels: string[],
  id: string,
  formData: FormData,
): Promise<ScoreActionState> {
  try {
    await requireCourseGradeManager(courseId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "권한이 없습니다." };
  }
  const parsed = parseScoreForm(formData, extraFieldLabels);
  if ("error" in parsed) return parsed;

  const supabase = createAdminClient();
  try {
    await assertEnrolled(supabase, courseId, studentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "확인 중 오류가 발생했습니다." };
  }

  // profile_id까지 같이 걸어서, 이 학생 소유가 아닌 리포트 id를 넘겨도
  // 수정되지 않게 한다.
  const { error } = await supabase
    .from("score_reports")
    .update(parsed)
    .eq("id", id)
    .eq("profile_id", studentId);

  if (error) return { error: error.message };

  revalidateScoreReportPaths(courseId, studentId);
  return { success: true };
}

export async function deleteScoreReport(
  courseId: string,
  studentId: string,
  id: string,
) {
  await requireCourseGradeManager(courseId);
  const supabase = createAdminClient();
  await supabase
    .from("score_reports")
    .delete()
    .eq("id", id)
    .eq("profile_id", studentId);
  revalidateScoreReportPaths(courseId, studentId);
}
