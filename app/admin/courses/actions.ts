"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();

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

  const { error } = await supabase.from("courses").insert({
    subject: instructor.subject,
    title,
    teacher_name: instructor.name,
    instructor_id: instructorId,
    school: school || null,
    thumbnail_url: thumbnailUrl || null,
    overview: overview || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/courses");
  return { success: true };
}

export async function updateCourse(
  courseId: string,
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();

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
      thumbnail_url: thumbnailUrl || null,
      overview: overview || null,
    })
    .eq("id", courseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/my-classroom/${courseId}`);
  return { success: true };
}

export async function deleteCourse(id: string) {
  const supabase = createAdminClient();
  await supabase.from("courses").delete().eq("id", id);
  revalidatePath("/admin/courses");
}

export async function deleteCourseAndRedirect(id: string) {
  await deleteCourse(id);
  redirect("/admin/courses");
}
