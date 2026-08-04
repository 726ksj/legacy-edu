"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMuxClient } from "@/lib/mux";

export async function createDirectUpload(courseId: string) {
  const mux = createMuxClient();
  const upload = await mux.video.uploads.create({
    cors_origin: "*",
    new_asset_settings: { playback_policy: ["signed"], passthrough: courseId },
  });

  return { uploadUrl: upload.url ?? "", uploadId: upload.id };
}

export async function saveLesson(
  courseId: string,
  title: string,
  uploadId: string,
  description: string,
) {
  const mux = createMuxClient();
  const upload = await mux.video.uploads.retrieve(uploadId);

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("lessons")
    .select("order_no")
    .eq("course_id", courseId)
    .order("order_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrderNo = (existing?.order_no ?? 0) + 1;

  await supabase.from("lessons").insert({
    course_id: courseId,
    title,
    order_no: nextOrderNo,
    mux_asset_id: upload.asset_id ?? null,
    status: "preparing",
    description: description || null,
  });

  revalidatePath(`/admin/courses/${courseId}/lessons`);
  revalidatePath(`/my-classroom/${courseId}`);
}

export interface UpdateLessonInfoState {
  error?: string;
  success?: boolean;
}

export async function updateLessonInfo(
  lessonId: string,
  courseId: string,
  _prevState: UpdateLessonInfoState,
  formData: FormData,
): Promise<UpdateLessonInfoState> {
  const title = String(formData.get("title") ?? "").trim();
  const orderNoRaw = String(formData.get("orderNo") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const orderNo = Number(orderNoRaw);

  if (!title || !orderNoRaw || Number.isNaN(orderNo)) {
    return { error: "차시 제목과 차시 번호를 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      order_no: orderNo,
      description: description || null,
    })
    .eq("id", lessonId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${courseId}/lessons`);
  revalidatePath(`/my-classroom/${courseId}`);
  return { success: true };
}

export async function deleteLesson(lessonId: string, courseId: string) {
  const supabase = createAdminClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("mux_asset_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lesson?.mux_asset_id) {
    const mux = createMuxClient();
    try {
      await mux.video.assets.delete(lesson.mux_asset_id);
    } catch {
      // Mux에 이미 없거나 삭제 실패해도 DB 레코드는 정리
    }
  }

  await supabase.from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}/lessons`);
}
