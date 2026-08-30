"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

const ATTACHMENT_BUCKET = "notice-attachments";

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

async function uploadAttachments(
  supabase: ReturnType<typeof createAdminClient>,
  noticeId: string,
  formData: FormData,
) {
  const files = formData
    .getAll("attachments")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) return;

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const path = `${randomUUID()}${ext ? `.${ext}` : ""}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type || undefined });

    if (uploadError) {
      throw new Error(`첨부파일 업로드에 실패했습니다: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);

    await supabase.from("notice_attachments").insert({
      notice_id: noticeId,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type || null,
    });
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
  const { data: notice, error } = await supabase
    .from("notices")
    .insert(parsed.fields)
    .select("id")
    .single();

  if (error || !notice) {
    return { error: error?.message ?? "등록에 실패했습니다." };
  }

  try {
    await uploadAttachments(supabase, notice.id, formData);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "첨부파일 업로드에 실패했습니다.",
    };
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

  try {
    await uploadAttachments(supabase, id, formData);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "첨부파일 업로드에 실패했습니다.",
    };
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

export async function deleteNoticeAttachment(
  attachmentId: string,
  noticeId: string,
) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("notice_attachments").delete().eq("id", attachmentId);
  revalidateNoticePaths(noticeId);
}
