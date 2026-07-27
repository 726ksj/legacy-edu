"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateCourseState {
  error?: string;
  success?: boolean;
}

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const teacherName = String(formData.get("teacherName") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();

  if (!subject || !title || !teacherName) {
    return { error: "과목, 강좌명, 선생님 이름을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("courses").insert({
    subject,
    title,
    teacher_name: teacherName,
    school: school || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/courses");
  return { success: true };
}

export async function deleteCourse(id: string) {
  const supabase = createAdminClient();
  await supabase.from("courses").delete().eq("id", id);
  revalidatePath("/admin/courses");
}
