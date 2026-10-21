"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/email";
import { isProtectedAdminAccount } from "@/lib/adminProtection";

export interface UpdateUserState {
  error?: string;
  success?: boolean;
}

export async function updateUser(
  id: string,
  _prevState: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name || !phone || !address) {
    return { error: "이름, 전화번호, 주소는 비워둘 수 없습니다." };
  }
  if (email && !isValidEmail(email)) {
    return { error: "이메일 형식이 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      phone,
      guardian_phone: guardianPhone || null,
      address,
      school: school || null,
      grade: grade || null,
      email: email || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { success: true };
}

export async function removeUserDevice(userId: string, deviceRowId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase
    .from("user_devices")
    .delete()
    .eq("id", deviceRowId)
    .eq("user_id", userId);

  revalidatePath(`/admin/users/${userId}`);
}

export interface DeleteUserState {
  error?: string;
}

export async function deleteUser(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: DeleteUserState,
): Promise<DeleteUserState> {
  await requireAdmin();
  if (await isProtectedAdminAccount(id)) {
    return { error: "관리자 계정은 이 화면에서 삭제할 수 없습니다." };
  }

  const supabase = createAdminClient();
  // auth 유저 삭제 시 profiles 행(및 enrollments)도 on delete cascade로 함께 삭제됨
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// 회원 상세 화면에서 학생의 수강 권한을 해지한다. 메모(questions)는 enrollments와
// 직접 연결돼 있지 않아서, 해제하기 전에 어떤 학생·강좌였는지 먼저 알아둬야 그
// 강좌의 차시에 남긴 메모를 찾아 같이 지울 수 있다.
export async function deleteEnrollment(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

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

    revalidatePath(`/admin/users/${enrollment.profile_id}`);
  }
}
