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
  });

  revalidatePath(`/admin/courses/${courseId}/lessons`);
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
