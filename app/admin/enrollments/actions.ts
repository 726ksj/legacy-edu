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
  const profileId = String(formData.get("profileId") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim();

  if (!profileId || !courseId) {
    return { error: "강좌와 학생을 선택해주세요." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("enrollments")
    .insert({ profile_id: profileId, course_id: courseId });

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
