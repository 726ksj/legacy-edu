"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpdateNoteState {
  error?: string;
  success?: boolean;
}

export async function updateNote(
  id: string,
  userId: string,
  _prevState: UpdateNoteState,
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

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/mypage/notes");
  return { success: true };
}
