"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/mailer";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_PER_PHONE = 5;
const RATE_LIMIT_MAX_PER_IP = 20;
const RATE_LIMIT_MESSAGE =
  "너무 많이 시도하셨습니다. 15분 후 다시 시도해주세요.";

export interface FindIdState {
  error?: string;
  sent?: boolean;
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
    .select("username, phone, email")
    .eq("name", name);

  const match = (candidates ?? []).find(
    (candidate) => digitsOnly(candidate.phone) === digitsOnly(phone),
  );

  // 일치 여부와 무관하게 항상 같은 응답을 준다 - 화면 메시지가 달라지면
  // 그 자체로 "이 이름+전화번호 조합의 계정이 존재하는지"가 새어나간다.
  // 발송 자체가 실패해도(메일 서비스 장애 등) 마찬가지로 화면엔 그대로
  // 성공 문구를 보여준다.
  if (match?.email) {
    try {
      await sendEmail({
        to: match.email,
        subject: "[LEGACY EDU] 아이디 찾기 결과",
        text: `안녕하세요, LEGACY EDU입니다.\n\n요청하신 아이디는 다음과 같습니다.\n\n아이디: ${match.username}\n\n본인이 요청하지 않았다면 이 이메일을 무시해주세요.`,
      });
    } catch (error) {
      console.error("아이디 찾기 이메일 발송 실패:", error);
    }
  }

  return { sent: true };
}
