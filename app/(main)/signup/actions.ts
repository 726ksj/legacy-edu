"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SignupState {
  error?: string;
  success?: boolean;
}

const EMAIL_DOMAIN = "legacyedu.local";

export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const studentCode = String(formData.get("studentCode") ?? "").trim();

  if (!name || !address || !phone || !username || !password || !studentCode) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const supabase = createAdminClient();

  const { data: codeRow, error: codeError } = await supabase
    .from("student_codes")
    .select("id, is_used")
    .eq("code", studentCode)
    .maybeSingle();

  if (codeError) {
    return { error: "학생코드 확인 중 오류가 발생했습니다." };
  }
  if (!codeRow) {
    return { error: "존재하지 않는 학생코드입니다." };
  }
  if (codeRow.is_used) {
    return { error: "이미 사용된 학생코드입니다." };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    return { error: "이미 사용 중인 아이디입니다." };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "회원가입 중 오류가 발생했습니다." };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    username,
    name,
    phone,
    address,
    student_code_id: codeRow.id,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: "프로필 저장 중 오류가 발생했습니다." };
  }

  await supabase
    .from("student_codes")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", codeRow.id);

  return { success: true };
}
