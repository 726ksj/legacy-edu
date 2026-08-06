"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AnswerQuestionState {
  error?: string;
  success?: boolean;
}

export async function answerQuestion(
  id: string,
  _prevState: AnswerQuestionState,
  formData: FormData,
): Promise<AnswerQuestionState> {
  const answer = String(formData.get("answer") ?? "").trim();

  if (!answer) {
    return { error: "답변 내용을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("questions")
    .update({
      answer,
      answered_at: new Date().toISOString(),
      answer_read_at: null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/qna");
  return { success: true };
}
