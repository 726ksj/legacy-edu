"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateNoteState {
  error?: string;
  success?: boolean;
}

export async function updateNote(
  id: string,
  _prevState: UpdateNoteState,
  formData: FormData,
): Promise<UpdateNoteState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "메모 내용을 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update({ content })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/mypage/notes");
  return { success: true };
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", id);
  revalidatePath("/mypage/notes");
}
