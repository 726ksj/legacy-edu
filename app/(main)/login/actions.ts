"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

const EMAIL_DOMAIN = "legacyedu.local";

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@${EMAIL_DOMAIN}`,
    password,
  });

  if (error) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  if (username === process.env.ADMIN_USERNAME) {
    redirect("/admin");
  }

  redirect("/mypage");
}
