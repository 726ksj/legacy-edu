"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPassword, PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";

export interface SignupState {
  error?: string;
  success?: boolean;
}

const EMAIL_DOMAIN = "legacyedu.local";

async function releaseMemberCode(
  supabase: ReturnType<typeof createAdminClient>,
  codeId: string,
) {
  await supabase
    .from("member_codes")
    .update({ is_used: false, used_at: null })
    .eq("id", codeId);
}

// 학생/선생님 가입 둘 다 같은 회원코드 체계를 쓰되, 코드에 박힌 역할과
// 지금 시도하는 가입 화면이 일치하는지 먼저 확인한다. 동시 가입 요청에
// 대비해 계정을 만들기 전에 코드를 원자적으로 선점한다(is_used=false일
// 때만 반영되는 조건부 UPDATE) - 실패하면 releaseMemberCode로 되돌린다.
async function claimMemberCode(
  supabase: ReturnType<typeof createAdminClient>,
  code: string,
  expectedRole: "student" | "teacher",
): Promise<{ error: string } | { id: string; memberName: string }> {
  const { data: codeRow, error: codeError } = await supabase
    .from("member_codes")
    .select("id, is_used, role, member_name")
    .eq("code", code)
    .maybeSingle();

  if (codeError) {
    return { error: "코드 확인 중 오류가 발생했습니다." };
  }
  if (!codeRow) {
    return { error: "존재하지 않는 코드입니다." };
  }
  if (codeRow.role !== expectedRole) {
    return {
      error:
        expectedRole === "student"
          ? "학생용 코드가 아닙니다."
          : "선생님용 코드가 아닙니다.",
    };
  }
  if (codeRow.is_used) {
    return { error: "이미 사용된 코드입니다." };
  }

  const { data: claimed } = await supabase
    .from("member_codes")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", codeRow.id)
    .eq("is_used", false)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return { error: "이미 사용된 코드입니다." };
  }

  return { id: codeRow.id, memberName: codeRow.member_name };
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
  const memberCode = String(formData.get("memberCode") ?? "").trim();

  if (
    !name ||
    !address ||
    !phone ||
    !guardianPhone ||
    !school ||
    !grade ||
    !username ||
    !password ||
    !memberCode
  ) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (!isValidPassword(password)) {
    return { error: `비밀번호는 ${PASSWORD_REQUIREMENT_TEXT}로 입력해주세요.` };
  }

  const supabase = createAdminClient();

  const claim = await claimMemberCode(supabase, memberCode, "student");
  if ("error" in claim) {
    return { error: claim.error };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    await releaseMemberCode(supabase, claim.id);
    return { error: "이미 사용 중인 아이디입니다." };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    await releaseMemberCode(supabase, claim.id);
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
    role: "student",
    member_code_id: claim.id,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    await releaseMemberCode(supabase, claim.id);
    return { error: "프로필 저장 중 오류가 발생했습니다." };
  }

  return { success: true };
}

export async function signupTeacher(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const memberCode = String(formData.get("memberCode") ?? "").trim();

  if (!phone || !username || !password || !memberCode) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (!isValidPassword(password)) {
    return { error: `비밀번호는 ${PASSWORD_REQUIREMENT_TEXT}로 입력해주세요.` };
  }

  const supabase = createAdminClient();

  const claim = await claimMemberCode(supabase, memberCode, "teacher");
  if ("error" in claim) {
    return { error: claim.error };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    await releaseMemberCode(supabase, claim.id);
    return { error: "이미 사용 중인 아이디입니다." };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    await releaseMemberCode(supabase, claim.id);
    return { error: authError?.message ?? "가입 중 오류가 발생했습니다." };
  }

  // 관리자가 코드 발급 시 입력한 이름을 그대로 쓴다 - 담당 강좌 배정은
  // 강좌 관리 화면에서 별도로 한다.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    username,
    name: claim.memberName,
    phone,
    address: "-",
    role: "teacher",
    member_code_id: claim.id,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    await releaseMemberCode(supabase, claim.id);
    return { error: "프로필 저장 중 오류가 발생했습니다." };
  }

  return { success: true };
}
