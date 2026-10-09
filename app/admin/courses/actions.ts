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
    .select("name, subject, profile_id")
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

function readCourseInfoField(formData: FormData, name: string) {
  const text = String(formData.get(name) ?? "").trim();
  return text || null;
}

function readListingFields(formData: FormData) {
  const level = String(formData.get("level") ?? "").trim();
  const isBest = formData.get("isBest") === "on";
  const durationWeeksRaw = String(formData.get("durationWeeks") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "")
    .replace(/,/g, "")
    .trim();

  const durationWeeks = durationWeeksRaw ? Number(durationWeeksRaw) : null;

  return {
    level: level || null,
    is_best: isBest,
    duration_days: durationWeeks ? durationWeeks * 7 : null,
    // 수강기간(주)이 곧 주차별 관리의 주차 수다. 1~52주만 주차 구성을 쓴다.
    total_weeks:
      durationWeeks && durationWeeks >= 1 && durationWeeks <= 52
        ? Math.round(durationWeeks)
        : null,
    // 시작일 입력이 없는 폼(예전 수정 화면)에서 저장해도 값이 지워지지
    // 않도록, 필드가 폼에 있을 때만 갱신한다.
    ...(formData.has("startDate")
      ? { start_date: String(formData.get("startDate") ?? "").trim() || null }
      : {}),
    price: priceRaw ? Number(priceRaw) : 0,
    course_scope: readCourseInfoField(formData, "courseScope"),
    content_features: readCourseInfoField(formData, "contentFeatures"),
    target_audience: readCourseInfoField(formData, "targetAudience"),
  };
}

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const assistantProfileId = String(
    formData.get("assistantProfileId") ?? "",
  ).trim();
  const school = String(formData.get("school") ?? "").trim();
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

  // 선택한 강사의 로그인 계정이 곧 이 강좌의 담당 강사(영상 업로드/공지
  // 작성 권한)가 된다. 계정이 연결되지 않은 강사로는 강좌를 만들 수 없다.
  if (!instructor.profile_id) {
    return {
      error:
        "선택한 강사에 로그인 계정이 연결되어 있지 않습니다. 강사 관리에서 계정을 먼저 연결해주세요.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("courses")
    .insert({
      subject: instructor.subject,
      title,
      teacher_name: instructor.name,
      instructor_id: instructorId,
      school: school || null,
      ...listingFields,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "등록에 실패했습니다." };
  }

  await syncCourseStaff(supabase, inserted.id, "teacher", instructor.profile_id);
  await syncCourseStaff(supabase, inserted.id, "assistant", assistantProfileId);

  revalidatePath("/admin/courses");
  revalidatePath("/courses/high");
  revalidatePath("/courses/middle");
  revalidatePath(`/courses/${inserted.id}`);
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
  const assistantProfileId = String(
    formData.get("assistantProfileId") ?? "",
  ).trim();
  const school = String(formData.get("school") ?? "").trim();
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
      ...listingFields,
    })
    .eq("id", courseId);

  if (error) {
    return { error: error.message };
  }

  // 강사를 바꾸면 담당 강사 계정도 새 강사의 계정으로 맞춘다. 계정이 없는
  // 강사(기존 데이터)로 바꾸는 경우에는 기존 배정을 건드리지 않는다.
  if (instructor.profile_id) {
    await syncCourseStaff(supabase, courseId, "teacher", instructor.profile_id);
  }
  // 조교 선택이 없는 폼(예전 수정 화면)에서 저장해도 배정이 지워지지 않게
  // 필드가 있을 때만 맞춘다.
  if (formData.has("assistantProfileId")) {
    await syncCourseStaff(supabase, courseId, "assistant", assistantProfileId);
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses/high");
  revalidatePath("/courses/middle");
  revalidatePath(`/courses/${courseId}`);
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
