"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface NoticeFormState {
  error?: string;
  success?: boolean;
}

function readNoticeFields(formData: FormData) {
  const category = String(formData.get("category") ?? "공지").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." } as const;
  }
  if (category !== "공지" && category !== "이벤트") {
    return { error: "구분을 다시 선택해주세요." } as const;
  }

  return { fields: { category, title, content } } as const;
}

function revalidateNoticePaths(id?: string) {
  revalidatePath("/notice");
  if (id) {
    revalidatePath(`/notice/${id}`);
  }
}

export async function createNotice(
  _prevState: NoticeFormState,
  formData: FormData,
): Promise<NoticeFormState> {
  await requireAdmin();
  const parsed = readNoticeFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("notices").insert(parsed.fields);

  if (error) {
    return { error: error.message };
  }

  revalidateNoticePaths();
  return { success: true };
}

export async function updateNotice(
  id: string,
  _prevState: NoticeFormState,
  formData: FormData,
): Promise<NoticeFormState> {
  await requireAdmin();
  const parsed = readNoticeFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notices")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateNoticePaths(id);
  return { success: true };
}

export async function deleteNotice(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("notices").delete().eq("id", id);
  revalidateNoticePaths();
}

export async function deleteNoticeAndRedirect(id: string) {
  await deleteNotice(id);
  redirect("/notice");
}
