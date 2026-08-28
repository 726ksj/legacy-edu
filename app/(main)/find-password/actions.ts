"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPassword, PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_PER_PHONE = 5;
const RATE_LIMIT_MAX_PER_IP = 20;
const RATE_LIMIT_MESSAGE =
  "너무 많이 시도하셨습니다. 15분 후 다시 시도해주세요.";

export interface FindPasswordState {
  error?: string;
  success?: boolean;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export async function resetPasswordSelfService(
  _prevState: FindPasswordState,
  formData: FormData,
): Promise<FindPasswordState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !phone || !username || !password || !confirmPassword) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (password !== confirmPassword) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }
  if (!isValidPassword(password)) {
    return {
      error: `비밀번호는 ${PASSWORD_REQUIREMENT_TEXT}로 입력해주세요.`,
    };
  }

  const phoneDigits = digitsOnly(phone);
  const ip = await getClientIp();

  // 같은 전화번호(본인확인 키)를 노린 무차별 대입과, 같은 IP에서 여러
  // 번호를 훑는 것 둘 다 막는다. find-id와 시도 횟수를 공유해서, 아이디
  // 찾기 → 비밀번호 찾기로 우회해도 한도가 그대로 적용되게 한다.
  const [phoneOk, ipOk] = await Promise.all([
    checkRateLimit(`identity-lookup:phone:${phoneDigits}`, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX_PER_PHONE,
    }),
    checkRateLimit(`identity-lookup:ip:${ip}`, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX_PER_IP,
    }),
  ]);

  if (!phoneOk || !ipOk) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const supabase = createAdminClient();

  // 전화번호는 가입 시 입력한 그대로 저장돼 있어(하이픈 유무가 다를 수
  // 있음), 숫자만 비교해야 정확히 매칭된다.
  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, phone")
    .eq("name", name)
    .eq("username", username);

  const match = (candidates ?? []).find(
    (candidate) => digitsOnly(candidate.phone) === digitsOnly(phone),
  );

  if (!match) {
    return { error: "일치하는 회원 정보를 찾을 수 없습니다." };
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    match.id,
    { password },
  );

  if (updateError) {
    return { error: "비밀번호 변경 중 오류가 발생했습니다." };
  }

  // 셀프서비스로 변경된 이력을 관리자가 확인할 수 있도록 남겨둔다.
  await supabase.from("password_reset_requests").insert({
    profile_id: match.id,
    name,
    phone,
    username,
    status: "completed",
  });

  return { success: true };
}
