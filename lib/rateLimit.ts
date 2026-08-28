import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

// key별 시도 횟수를 세서 한도를 넘으면 거부한다. 호출 시점에 만료된
// 기록도 같이 지워서 별도 정리 배치 없이도 테이블이 계속 늘어나지
// 않는다.
export async function checkRateLimit(
  key: string,
  { windowMs, max }: RateLimitOptions,
): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - windowMs).toISOString();

  await supabase
    .from("rate_limit_attempts")
    .delete()
    .eq("key", key)
    .lt("created_at", since);

  const { count } = await supabase
    .from("rate_limit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", since);

  if ((count ?? 0) >= max) {
    return false;
  }

  await supabase.from("rate_limit_attempts").insert({ key });
  return true;
}

export async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerStore.get("x-real-ip") ?? "unknown";
}
