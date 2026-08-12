import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출된 경우 무시 (미들웨어가 세션을 갱신)
          }
        },
      },
    },
  );
}

// supabase.auth.getUser()는 매번 네트워크로 Supabase Auth 서버에 왕복한다.
// 같은 요청 안에서 레이아웃(Header)과 페이지가 각자 getUser()를 호출하면
// 왕복이 중복되므로, React cache()로 요청 1회당 1번만 실제로 호출되게 한다.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
