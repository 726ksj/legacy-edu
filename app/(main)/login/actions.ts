"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE_NAME, MAX_DEVICES_PER_USER } from "@/lib/device";

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@${EMAIL_DOMAIN}`,
    password,
  });

  if (error || !data.user) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  const isAdmin = username === process.env.ADMIN_USERNAME;

  if (!isAdmin) {
    const deviceError = await registerDevice(supabase, data.user.id);
    if (deviceError) {
      await supabase.auth.signOut();
      return { error: deviceError };
    }
  }

  if (isAdmin) {
    redirect("/admin");
  }

  redirect("/");
}

async function registerDevice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  if (!deviceId) return null;

  const { data: existing } = await supabase
    .from("user_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    return null;
  }

  const { data: devices } = await supabase
    .from("user_devices")
    .select("id")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: true });

  const excess = (devices?.length ?? 0) - MAX_DEVICES_PER_USER + 1;
  if (excess > 0) {
    const idsToEvict = devices!.slice(0, excess).map((device) => device.id);
    await supabase.from("user_devices").delete().in("id", idsToEvict);
  }

  const headerStore = await headers();
  const { error } = await supabase.from("user_devices").insert({
    user_id: userId,
    device_id: deviceId,
    user_agent: headerStore.get("user-agent"),
  });

  if (error) {
    return "기기 등록 중 오류가 발생했습니다. 다시 시도해주세요.";
  }

  return null;
}
