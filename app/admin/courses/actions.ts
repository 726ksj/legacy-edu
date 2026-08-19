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

function readListingFields(formData: FormData) {
  const level = String(formData.get("level") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const isBest = formData.get("isBest") === "on";
  const durationWeeksRaw = String(formData.get("durationWeeks") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const materialPriceRaw = String(formData.get("materialPrice") ?? "").trim();

  return {
    level: level || null,
    tagline: tagline || null,
    is_best: isBest,
    duration_days: durationWeeksRaw ? Number(durationWeeksRaw) * 7 : null,
    price: priceRaw ? Number(priceRaw) : 0,
    material_price: materialPriceRaw ? Number(materialPriceRaw) : null,
  };
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

  const { error } = await supabase.from("courses").insert({
    subject: instructor.subject,
    title,
    teacher_name: instructor.name,
    instructor_id: instructorId,
    school: school || null,
    thumbnail_url: thumbnailUrl || null,
    overview: overview || null,
    ...listingFields,
  });

  if (error) {
    return { error: error.message };
  }

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
  const title = String(formData.get("title") ?? "").trim();
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
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
      thumbnail_url: thumbnailUrl || null,
      overview: overview || null,
      ...listingFields,
    })
    .eq("id", courseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses/high");
  revalidatePath("/courses/middle");
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
