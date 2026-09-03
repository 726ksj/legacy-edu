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

export interface AnswerQuestionState {
  error?: string;
  success?: boolean;
}

export async function answerQuestion(
  courseId: string,
  rootId: string,
  formData: FormData,
): Promise<AnswerQuestionState> {
  const adminUser = await requireAdmin();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "답변 내용을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { data: root } = await supabase
    .from("questions")
    .select("id, lesson_id")
    .eq("id", rootId)
    .is("parent_id", null)
    .maybeSingle();

  if (!root) {
    return { error: "질문을 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("questions").insert({
    lesson_id: root.lesson_id,
    profile_id: adminUser!.id,
    parent_id: root.id,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/notes/${courseId}`);
  revalidatePath("/mypage/notes");
  revalidatePath("/mypage/questions");
  revalidatePath(`/watch/${root.lesson_id}`);
  return { success: true };
}

// 답변(후속 질문이 아닌, 최초 질문에 달린 자식 메시지) 삭제. 최초 질문
// 자체는 삭제 대상이 아니라서 parent_id가 있는 행만 지운다 - 실수로
// 스레드 전체가 사라지는 걸 막는다.
export async function deleteAnswer(courseId: string, id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("questions")
    .select("lesson_id")
    .eq("id", id)
    .not("parent_id", "is", null)
    .maybeSingle();

  if (!row) return;

  await supabase.from("questions").delete().eq("id", id);

  revalidatePath(`/admin/notes/${courseId}`);
  revalidatePath("/mypage/notes");
  revalidatePath("/mypage/questions");
  revalidatePath(`/watch/${row.lesson_id}`);
}
