"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AskQuestionState {
  error?: string;
  success?: boolean;
}

export async function askQuestion(
  lessonId: string,
  _prevState: AskQuestionState,
  formData: FormData,
): Promise<AskQuestionState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "질문 내용을 입력해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("questions").insert({
    lesson_id: lessonId,
    profile_id: user.id,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/watch/${lessonId}`);
  return { success: true };
}

export async function deleteQuestion(id: string, lessonId: string) {
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", id);
  revalidatePath(`/watch/${lessonId}`);
}
