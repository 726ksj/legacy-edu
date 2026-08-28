"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { createMuxClient, pollUploadForAssetId } from "@/lib/mux";
import type { LessonVisibility } from "@/lib/enrollments";

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

export async function createDirectUpload(
  courseId: string,
): Promise<
  { uploadUrl: string; uploadId: string } | { error: string }
> {
  await requireAdmin();
  const mux = createMuxClient();
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: { playback_policy: ["signed"], passthrough: courseId },
    });
    return { uploadUrl: upload.url ?? "", uploadId: upload.id };
  } catch {
    return {
      error: "영상 서버(Mux) 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

export async function saveLesson(
  courseId: string,
  title: string,
  uploadId: string,
  description: string,
  visibility: LessonVisibility,
  profileIds: string[],
): Promise<{ error?: string }> {
  await requireAdmin();
  const mux = createMuxClient();
  let upload;
  try {
    upload = await mux.video.uploads.retrieve(uploadId);
  } catch {
    return {
      error: "영상 업로드 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  // Mux는 업로드가 끝나도 asset을 비동기로 나중에 만들어서, 이 시점엔
  // asset_id가 아직 없을 수 있다. 잠깐 재시도하며 기다리고, 그래도 안
  // 나타나면 upload_id를 저장해둬서 syncLessonStatuses/웹훅이 나중에
  // 마저 채울 수 있게 한다 (그냥 null로 저장하면 영영 복구 불가능해짐).
  const assetId = upload.asset_id ?? (await pollUploadForAssetId(uploadId));

  const supabase = createAdminClient();
  const { data: existingLessons } = await supabase
    .from("lessons")
    .select("id, title")
    .eq("course_id", courseId);

  const { data: inserted, error: insertError } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title,
      order_no: (existingLessons?.length ?? 0) + 1,
      mux_asset_id: assetId,
      mux_upload_id: assetId ? null : uploadId,
      status: "preparing",
      description: description || null,
      visibility,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      error: `차시 저장에 실패했습니다: ${insertError?.message ?? "알 수 없는 오류"}`,
    };
  }

  if (visibility !== "all" && profileIds.length > 0) {
    await supabase.from("lesson_access").insert(
      profileIds.map((profileId) => ({
        lesson_id: inserted.id,
        profile_id: profileId,
      })),
    );
  }

  // 업로드할 때마다 강좌의 모든 차시를 제목 기준 오름차순으로 다시 매겨서,
  // 어떤 순서로 업로드하든 항상 제목 순서대로 나열되게 한다.
  const allLessons = [
    ...(existingLessons ?? []),
    { id: inserted.id, title },
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
  return {};
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
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const orderNoRaw = String(formData.get("orderNo") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const orderNo = Number(orderNoRaw);
  const visibility = String(
    formData.get("visibility") ?? "all",
  ) as LessonVisibility;
  const profileIds = formData.getAll("profileIds").map(String);

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
      visibility,
    })
    .eq("id", lessonId);

  if (error) {
    return { error: error.message };
  }

  // 공개 대상이 바뀌었을 수 있으니 항상 허용/제외 목록을 새로 씀 (전체
  // 공개로 전환한 경우에도 남아있던 목록이 깨끗이 비워지도록).
  await supabase.from("lesson_access").delete().eq("lesson_id", lessonId);
  if (visibility !== "all" && profileIds.length > 0) {
    await supabase.from("lesson_access").insert(
      profileIds.map((profileId) => ({
        lesson_id: lessonId,
        profile_id: profileId,
      })),
    );
  }

  revalidatePath(`/admin/courses/${courseId}/lessons`);
  revalidatePath(`/my-classroom/${courseId}`);
  return { success: true };
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireAdmin();
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
