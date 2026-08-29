"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPassword, PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";

export interface SignupState {
  error?: string;
  success?: boolean;
}

const EMAIL_DOMAIN = "legacyedu.local";

async function releaseStudentCode(
  supabase: ReturnType<typeof createAdminClient>,
  codeId: string,
) {
  await supabase
    .from("student_codes")
    .update({ is_used: false, used_at: null })
    .eq("id", codeId);
}

export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const studentCode = String(formData.get("studentCode") ?? "").trim();

  if (
    !name ||
    !address ||
    !phone ||
    !guardianPhone ||
    !school ||
    !grade ||
    !username ||
    !password ||
    !studentCode
  ) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (!isValidPassword(password)) {
    return { error: `비밀번호는 ${PASSWORD_REQUIREMENT_TEXT}로 입력해주세요.` };
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

  // 같은 코드로 거의 동시에 가입 요청이 두 번 들어오면 둘 다 위의
  // is_used 확인을 통과할 수 있다. 계정을 만들기 전에 코드를 먼저
  // 원자적으로 선점해서(is_used=false일 때만 반영되는 조건부 UPDATE),
  // 동시 요청 중 하나만 실제로 계정을 만들도록 한다. 이후 단계가
  // 실패하면 releaseStudentCode로 다시 미사용 상태로 되돌린다.
  const { data: claimedCode } = await supabase
    .from("student_codes")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", codeRow.id)
    .eq("is_used", false)
    .select("id")
    .maybeSingle();

  if (!claimedCode) {
    return { error: "이미 사용된 학생코드입니다." };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    await releaseStudentCode(supabase, codeRow.id);
    return { error: "이미 사용 중인 아이디입니다." };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    await releaseStudentCode(supabase, codeRow.id);
    return { error: authError?.message ?? "회원가입 중 오류가 발생했습니다." };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    username,
    name,
    phone,
    guardian_phone: guardianPhone,
    address,
    school,
    grade,
    student_code_id: codeRow.id,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    await releaseStudentCode(supabase, codeRow.id);
    return { error: "프로필 저장 중 오류가 발생했습니다." };
  }

  return { success: true };
}
