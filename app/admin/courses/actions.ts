"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateCourseState {
  error?: string;
  success?: boolean;
}

async function resolveInstructorName(
  supabase: ReturnType<typeof createAdminClient>,
  instructorId: string,
) {
  const { data } = await supabase
    .from("instructors")
    .select("name")
    .eq("id", instructorId)
    .maybeSingle();
  return data?.name ?? "";
}

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();

  if (!subject || !title || !instructorId) {
    return { error: "과목, 강좌명, 강사를 선택해주세요." };
  }

  const supabase = createAdminClient();
  const teacherName = await resolveInstructorName(supabase, instructorId);

  const { error } = await supabase.from("courses").insert({
    subject,
    title,
    teacher_name: teacherName,
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
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();

  if (!subject || !title || !instructorId) {
    return { error: "과목, 강좌명, 강사를 선택해주세요." };
  }

  const supabase = createAdminClient();
  const teacherName = await resolveInstructorName(supabase, instructorId);

  const { error } = await supabase
    .from("courses")
    .update({
      subject,
      title,
      teacher_name: teacherName,
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
