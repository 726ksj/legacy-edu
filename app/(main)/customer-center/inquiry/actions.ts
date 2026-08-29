"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export interface InquiryState {
  error?: string;
  success?: boolean;
}

export async function submitInquiry(
  _prevState: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !phone || !message) {
    return { error: "이름, 전화번호, 문의 내용을 모두 입력해주세요." };
  }

  // 비로그인 공개 폼이라 스팸 등록을 막기 위해 IP당 시도 횟수를 제한한다.
  const ip = await getClientIp();
  const ok = await checkRateLimit(`inquiry:ip:${ip}`, {
    windowMs: 15 * 60 * 1000,
    max: 5,
  });

  if (!ok) {
    return { error: "너무 많이 시도하셨습니다. 15분 후 다시 시도해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("inquiries").insert({
    name,
    phone,
    message,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
