"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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
