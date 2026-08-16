import "server-only";
import { createClient } from "@supabase/supabase-js";

// 로그인 세션과 무관한 공개 데이터(리뷰, 사이트 콘텐츠 등)를 읽을 때 사용.
// cookies()에 의존하지 않으므로 "use cache" 스코프 안에서도 호출할 수 있다.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
