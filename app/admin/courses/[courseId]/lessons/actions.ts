"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMuxClient } from "@/lib/mux";

// 차시 제목은 "1강 - 문법 정리"처럼 앞에 번호가 붙는 관례라, 제목에서 첫
// 숫자를 뽑아 그 숫자로 비교한다. 단순 문자열 정렬로는 "10강"이 "2강"보다
// 앞에 오는 문제가 생긴다.
function compareLessonTitles(a: string, b: string): number {
  const numA = a.match(/\d+/);
  const numB = b.match(/\d+/);
  if (numA && numB) {
    const diff = Number(numA[0]) - Number(numB[0]);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b, "ko");
}

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
  const { data: existingLessons } = await supabase
    .from("lessons")
    .select("id, title")
    .eq("course_id", courseId);

  const { data: inserted } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title,
      order_no: (existingLessons?.length ?? 0) + 1,
      mux_asset_id: upload.asset_id ?? null,
      status: "preparing",
      description: description || null,
    })
    .select("id")
    .single();

  // 업로드할 때마다 강좌의 모든 차시를 제목 기준 오름차순으로 다시 매겨서,
  // 어떤 순서로 업로드하든 항상 제목 순서대로 나열되게 한다.
  const allLessons = [
    ...(existingLessons ?? []),
    ...(inserted ? [{ id: inserted.id, title }] : []),
  ].sort((a, b) => compareLessonTitles(a.title, b.title));

  await Promise.all(
    allLessons.map((lesson, index) =>
      supabase
        .from("lessons")
        .update({ order_no: index + 1 })
        .eq("id", lesson.id),
    ),
  );

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
