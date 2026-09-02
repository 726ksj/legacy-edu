"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface UpdateNoteState {
  error?: string;
  success?: boolean;
}

export async function updateNote(
  courseId: string,
  id: string,
  formData: FormData,
): Promise<UpdateNoteState> {
  await requireAdmin();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "질문 내용을 입력해주세요." };
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
