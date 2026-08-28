"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_PER_PHONE = 5;
const RATE_LIMIT_MAX_PER_IP = 20;
const RATE_LIMIT_MESSAGE =
  "너무 많이 시도하셨습니다. 15분 후 다시 시도해주세요.";

export interface FindIdState {
  error?: string;
  username?: string;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export async function findId(
  _prevState: FindIdState,
  formData: FormData,
): Promise<FindIdState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    return { error: "이름과 전화번호를 입력해주세요." };
  }

  const phoneDigits = digitsOnly(phone);
  const ip = await getClientIp();

  // find-password와 시도 횟수를 공유한다 (identity-lookup:phone:* 키를
  // 같이 씀) - 아이디 찾기로 계정 존재 여부를 훑는 것도 같은 한도로 막는다.
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
    .select("username, phone")
    .eq("name", name);

  const match = (candidates ?? []).find(
    (candidate) => digitsOnly(candidate.phone) === digitsOnly(phone),
  );

  if (!match) {
    return { error: "일치하는 회원 정보를 찾을 수 없습니다." };
  }

  return { username: match.username };
}
