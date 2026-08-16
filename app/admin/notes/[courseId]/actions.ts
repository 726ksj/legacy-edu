"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpdateNoteState {
  error?: string;
  success?: boolean;
}

export async function updateNote(
  courseId: string,
  id: string,
  formData: FormData,
): Promise<UpdateNoteState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "메모 내용을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("questions")
    .update({ content })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/notes/${courseId}`);
  revalidatePath("/mypage/notes");
  return { success: true };
}
