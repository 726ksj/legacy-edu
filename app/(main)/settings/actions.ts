"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPassword, PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";
import { isValidEmail } from "@/lib/email";

export interface UpdateProfileState {
  error?: string;
  success?: boolean;
}

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name || !phone) {
    return { error: "이름과 전화번호는 비워둘 수 없습니다." };
  }
  if (email && !isValidEmail(email)) {
    return { error: "이메일 형식이 올바르지 않습니다." };
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // 강사/조교 계정은 보호자연락처/주소/학교/학년 화면 자체가 없으니,
  // 폼에서 안 보내온 값을 그대로 덮어써서 비워버리면 안 된다 - 학생
  // 계정일 때만 이 필드들을 같이 갱신한다.
  const isStaff = existingProfile?.role !== "student";

  const update: Record<string, unknown> = { name, phone, email: email || null };

  if (!isStaff) {
    const guardianPhone = String(formData.get("guardianPhone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const grade = String(formData.get("grade") ?? "").trim();

    if (!guardianPhone || !address) {
      return { error: "보호자 전화번호와 주소는 비워둘 수 없습니다." };
    }

    update.guardian_phone = guardianPhone;
    update.address = address;
    update.school = school || null;
    update.grade = grade || null;
  }

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export interface ChangePasswordState {
  error?: string;
  success?: boolean;
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "로그인이 필요합니다." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "새 비밀번호가 일치하지 않습니다." };
  }
  if (!isValidPassword(newPassword)) {
    return {
      error: `새 비밀번호는 ${PASSWORD_REQUIREMENT_TEXT}로 입력해주세요.`,
    };
  }

  // 현재 세션이 오래 유지된 상태에서 화면만 열려있을 수 있으니, 실제로
  // 비밀번호를 아는지 재로그인으로 한 번 더 확인한 뒤에만 변경한다.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    { password: newPassword },
  );

  if (updateError) {
    return { error: "비밀번호 변경 중 오류가 발생했습니다." };
  }

  return { success: true };
}
