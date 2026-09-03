"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateNoteState {
  error?: string;
  success?: boolean;
}

export async function updateNote(
  id: string,
  formData: FormData,
): Promise<UpdateNoteState> {
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

  // RLS가 이미 본인 것만 걸러주긴 하지만, 그게 유일한 방어선이 되지
  // 않도록 코드에서도 소유자를 직접 확인한다.
  const { error } = await supabase
    .from("questions")
    .update({ content })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/mypage/notes");
  return { success: true };
}

export interface ReplyState {
  error?: string;
  success?: boolean;
}

// 이미 답변이 달린 질문 아래에서 학생이 이어서 남기는 후속 질문. RLS의
// questions_insert_own_thread 정책이 "자기 소유 스레드에만 답글 가능"을
// DB 레벨에서도 강제한다.
export async function replyToOwnQuestion(
  rootId: string,
  formData: FormData,
): Promise<ReplyState> {
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

  const { data: root } = await supabase
    .from("questions")
    .select("id, lesson_id")
    .eq("id", rootId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!root) {
    return { error: "질문을 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("questions").insert({
    lesson_id: root.lesson_id,
    profile_id: user.id,
    parent_id: root.id,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/mypage/notes");
  revalidatePath(`/watch/${root.lesson_id}`);
  return { success: true };
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("questions")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  revalidatePath("/mypage/notes");
}
