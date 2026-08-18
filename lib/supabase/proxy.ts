import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE_NAME } from "@/lib/device";

/**
 * Access token가 만료되면 refresh token으로 갱신하고, 갱신된 쿠키를
 * 응답에 실어 보낸다. Server Component는 쿠키를 읽기만 할 뿐 브라우저에
 * 다시 써줄 수 없으므로, 이 갱신은 반드시 proxy에서 처리해야 한다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // createServerClient와 getUser() 사이에 다른 로직을 넣지 말 것 -
  // 세션이 갱신되지 않아 사용자가 이유 없이 로그아웃되는 문제가 생기면
  // 디버깅하기 매우 어려워진다.
  await supabase.auth.getUser();

  // 기기 등록 제한(로그인 시 사용)을 위해, 브라우저마다 고정되는 식별자를
  // 쿠키로 미리 발급해둔다. 로그인 폼 제출 시점에는 이미 이 쿠키가 있어야
  // 하므로, 로그인 액션이 아니라 모든 요청에 걸리는 미들웨어에서 처리한다.
  if (!request.cookies.get(DEVICE_COOKIE_NAME)) {
    response.cookies.set(DEVICE_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }

  return response;
}
