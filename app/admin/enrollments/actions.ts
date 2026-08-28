"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface CreateEnrollmentState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function createEnrollment(
  _prevState: CreateEnrollmentState,
  formData: FormData,
): Promise<CreateEnrollmentState> {
  await requireAdmin();
  const profileIds = formData
    .getAll("profileIds")
    .map(String)
    .filter(Boolean);
  const courseId = String(formData.get("courseId") ?? "").trim();

  if (!courseId || profileIds.length === 0) {
    return { error: "강좌와 학생을 선택해주세요." };
  }

  const supabase = createAdminClient();

  let registered = 0;
  let alreadyEnrolled = 0;
  for (const profileId of profileIds) {
    const { error } = await supabase
      .from("enrollments")
      .insert({ profile_id: profileId, course_id: courseId });

    if (error) {
      if (error.code === "23505") {
        alreadyEnrolled += 1;
        continue;
      }
      return { error: error.message };
    }
    registered += 1;
  }

  revalidatePath("/admin/enrollments");

  if (registered === 0) {
    return { error: "선택한 학생은 이미 모두 이 강좌에 등록되어 있습니다." };
  }

  return {
    success: true,
    message:
      alreadyEnrolled > 0
        ? `${registered}명 등록 완료 (이미 등록되어 있던 ${alreadyEnrolled}명 제외)`
        : `${registered}명 등록 완료`,
  };
}

export async function deleteEnrollment(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  // 메모(questions)는 enrollments와 직접 연결돼 있지 않아서, 수강 권한을
  // 해제하기 전에 어떤 학생·강좌였는지 먼저 알아둬야 그 강좌의 차시에
  // 남긴 메모를 찾아 같이 지울 수 있다.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("profile_id, course_id")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("enrollments").delete().eq("id", id);

  if (enrollment) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", enrollment.course_id);

    const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
    if (lessonIds.length > 0) {
      await supabase
        .from("questions")
        .delete()
        .eq("profile_id", enrollment.profile_id)
        .in("lesson_id", lessonIds);
    }
  }

  revalidatePath("/admin/enrollments");
  revalidatePath("/mypage/notes");
  if (enrollment) {
    revalidatePath(`/admin/users/${enrollment.profile_id}`);
    revalidatePath(`/admin/notes/${enrollment.course_id}`);
  }
}
