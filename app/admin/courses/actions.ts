"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { createMuxClient } from "@/lib/mux";

export interface CreateCourseState {
  error?: string;
  success?: boolean;
}

async function resolveInstructor(
  supabase: ReturnType<typeof createAdminClient>,
  instructorId: string,
) {
  const { data, error } = await supabase
    .from("instructors")
    .select("name, subject")
    .eq("id", instructorId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("선택한 강사를 찾을 수 없습니다.");
  }

  return data;
}

// 담당 강사/조교 계정은 강좌당 각각 하나만 지원한다(현재 단계 범위).
// role별로 기존 배정을 지우고 새로 고른 계정으로 다시 넣는 식으로 항상
// 최신 상태로 맞춘다 - 강사 배정을 바꿀 때 조교 배정까지 지워지면
// 안 되니 role을 걸고 지운다.
async function syncCourseStaff(
  supabase: ReturnType<typeof createAdminClient>,
  courseId: string,
  role: "teacher" | "assistant",
  profileId: string,
) {
  await supabase
    .from("course_teachers")
    .delete()
    .eq("course_id", courseId)
    .eq("role", role);
  if (profileId) {
    await supabase
      .from("course_teachers")
      .insert({ course_id: courseId, profile_id: profileId, role });
  }
}

function readListingFields(formData: FormData) {
  const level = String(formData.get("level") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const isBest = formData.get("isBest") === "on";
  const durationWeeksRaw = String(formData.get("durationWeeks") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "")
    .replace(/,/g, "")
    .trim();

  return {
    level: level || null,
    tagline: tagline || null,
    is_best: isBest,
    duration_days: durationWeeksRaw ? Number(durationWeeksRaw) * 7 : null,
    price: priceRaw ? Number(priceRaw) : 0,
  };
}

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const teacherProfileId = String(formData.get("teacherProfileId") ?? "").trim();
  const assistantProfileId = String(
    formData.get("assistantProfileId") ?? "",
  ).trim();
  const school = String(formData.get("school") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();
  const listingFields = readListingFields(formData);

  if (!title || !instructorId) {
    return { error: "강좌명과 강사를 선택해주세요." };
  }

  const supabase = createAdminClient();

  let instructor;
  try {
    instructor = await resolveInstructor(supabase, instructorId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "강사 조회에 실패했습니다." };
  }

  const { data: inserted, error } = await supabase
    .from("courses")
    .insert({
      subject: instructor.subject,
      title,
      teacher_name: instructor.name,
      instructor_id: instructorId,
      school: school || null,
      overview: overview || null,
      ...listingFields,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "등록에 실패했습니다." };
  }

  await syncCourseStaff(supabase, inserted.id, "teacher", teacherProfileId);
  await syncCourseStaff(supabase, inserted.id, "assistant", assistantProfileId);

  revalidatePath("/admin/courses");
  revalidatePath("/courses/high");
  revalidatePath("/courses/middle");
  return { success: true };
}

export async function updateCourse(
  courseId: string,
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const teacherProfileId = String(formData.get("teacherProfileId") ?? "").trim();
  const assistantProfileId = String(
    formData.get("assistantProfileId") ?? "",
  ).trim();
  const school = String(formData.get("school") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();
  const listingFields = readListingFields(formData);

  if (!title || !instructorId) {
    return { error: "강좌명과 강사를 선택해주세요." };
  }

  const supabase = createAdminClient();

  let instructor;
  try {
    instructor = await resolveInstructor(supabase, instructorId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "강사 조회에 실패했습니다." };
  }

  const { error } = await supabase
    .from("courses")
    .update({
      subject: instructor.subject,
      title,
      teacher_name: instructor.name,
      instructor_id: instructorId,
      school: school || null,
      overview: overview || null,
      ...listingFields,
    })
    .eq("id", courseId);

  if (error) {
    return { error: error.message };
  }

  await syncCourseStaff(supabase, courseId, "teacher", teacherProfileId);
  await syncCourseStaff(supabase, courseId, "assistant", assistantProfileId);

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses/high");
  revalidatePath("/courses/middle");
  revalidatePath(`/my-classroom/${courseId}`);
  return { success: true };
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  // courses 삭제는 FK CASCADE로 lessons 행도 같이 지우지만, Mux에 올려둔
  // 실제 영상 파일은 그걸로 안 지워진다. 미리 목록을 받아 Mux에서도
  // 지워두지 않으면 파일이 고아로 남아 계속 과금된다.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("mux_asset_id")
    .eq("course_id", id)
    .not("mux_asset_id", "is", null);

  if (lessons && lessons.length > 0) {
    const mux = createMuxClient();
    await Promise.all(
      lessons.map((lesson) =>
        mux.video.assets.delete(lesson.mux_asset_id!).catch(() => {
          // Mux에 이미 없거나 삭제 실패해도 강좌 삭제 자체는 계속 진행
        }),
      ),
    );
  }

  await supabase.from("courses").delete().eq("id", id);
  revalidatePath("/admin/courses");
}

export async function deleteCourseAndRedirect(id: string) {
  await deleteCourse(id);
  redirect("/admin/courses");
}
