"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SaveNoteState {
  error?: string;
  success?: boolean;
}

export async function saveNote(
  lessonId: string,
  _prevState: SaveNoteState,
  formData: FormData,
): Promise<SaveNoteState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "메모 내용을 입력해주세요." };
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
  revalidatePath("/mypage/notes");
  return { success: true };
}

export interface UpdateNoteState {
  error?: string;
  success?: boolean;
}

export async function updateNote(
  id: string,
  lessonId: string,
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

  revalidatePath(`/watch/${lessonId}`);
  revalidatePath("/mypage/notes");
  return { success: true };
}

export async function deleteNote(id: string, lessonId: string) {
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", id);
  revalidatePath(`/watch/${lessonId}`);
  revalidatePath("/mypage/notes");
}
