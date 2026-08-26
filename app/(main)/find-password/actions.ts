"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface FindPasswordState {
  error?: string;
  success?: boolean;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export async function requestPasswordReset(
  _prevState: FindPasswordState,
  formData: FormData,
): Promise<FindPasswordState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!name || !phone || !username) {
    return { error: "이름, 전화번호, 아이디를 모두 입력해주세요." };
  }

  const supabase = createAdminClient();

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

  const { error } = await supabase.from("password_reset_requests").insert({
    profile_id: match.id,
    name,
    phone,
    username,
  });

  if (error) {
    return { error: "요청 접수 중 오류가 발생했습니다." };
  }

  return { success: true };
}
