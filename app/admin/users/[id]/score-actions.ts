"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface ScoreActionState {
  error?: string;
  success?: boolean;
}

function parseScoreForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const score = String(formData.get("score") ?? "").trim();
  const examDate = String(formData.get("examDate") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!title || !score) {
    return { error: "시험명과 점수를 입력해주세요." } as const;
  }

  return {
    title,
    subject: subject || null,
    score,
    exam_date: examDate || null,
    memo: memo || null,
  } as const;
}

function revalidateScoreReportPaths(userId: string) {
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/mypage/score-report");
  revalidatePath("/mypage/score-report/[slug]", "layout");
}

export async function addScoreReport(
  userId: string,
  reportType: string,
  formData: FormData,
): Promise<ScoreActionState> {
  await requireAdmin();
  const parsed = parseScoreForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("score_reports").insert({
    profile_id: userId,
    report_type: reportType,
    ...parsed,
  });

  if (error) return { error: error.message };

  revalidateScoreReportPaths(userId);
  return { success: true };
}

export async function updateScoreReport(
  userId: string,
  id: string,
  formData: FormData,
): Promise<ScoreActionState> {
  await requireAdmin();
  const parsed = parseScoreForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("score_reports")
    .update(parsed)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateScoreReportPaths(userId);
  return { success: true };
}

export async function deleteScoreReport(userId: string, id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("score_reports").delete().eq("id", id);
  revalidateScoreReportPaths(userId);
}
