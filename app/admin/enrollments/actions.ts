"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateEnrollmentState {
  error?: string;
  success?: boolean;
}

export async function createEnrollment(
  _prevState: CreateEnrollmentState,
  formData: FormData,
): Promise<CreateEnrollmentState> {
  const username = String(formData.get("username") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim();

  if (!username || !courseId) {
    return { error: "학생 아이디와 강좌를 입력해주세요." };
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return { error: "존재하지 않는 아이디입니다." };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({ profile_id: profile.id, course_id: courseId });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "이미 이 강좌에 등록된 학생입니다."
          : error.message,
    };
  }

  revalidatePath("/admin/enrollments");
  return { success: true };
}

export async function deleteEnrollment(id: string) {
  const supabase = createAdminClient();
  await supabase.from("enrollments").delete().eq("id", id);
  revalidatePath("/admin/enrollments");
}
