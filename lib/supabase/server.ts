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

// 이 프로젝트는 비대칭(ES256) JWT 서명 키를 사용하므로, getUser()로 매번
// Supabase Auth 서버에 왕복하는 대신 getClaims()로 로컬에서 서명을 검증한다.
// getUser()와 동일하게 위조된 세션은 걸러내면서 네트워크 홉만 없앤다.
//
// createClient()가 요청마다 새 클라이언트를 만들기 때문에 SDK 내부의
// JWKS 캐시(클라이언트 인스턴스에 귀속)는 매 요청 리셋된다. 그래서 검증용
// 공개키는 모듈 스코프에서 직접 캐싱해 서버 프로세스가 살아있는 동안
// 요청 간에 재사용한다. TTL은 Supabase SDK 자체 기본값(10분)과 맞췄다.
type GetClaimsOptions = Parameters<
  Awaited<ReturnType<typeof createClient>>["auth"]["getClaims"]
>[1];
type Jwks = NonNullable<NonNullable<GetClaimsOptions>["jwks"]>;

const JWKS_TTL_MS = 10 * 60 * 1000;
let jwksCache: { jwks: Jwks; fetchedAt: number } | null = null;

async function getCachedJwks(): Promise<Jwks | undefined> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.jwks;
  }
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/auth/v1/.well-known/jwks.json`,
  );
  if (!res.ok) return jwksCache?.jwks;
  const jwks = (await res.json()) as Jwks;
  jwksCache = { jwks, fetchedAt: Date.now() };
  return jwks;
}

// getClaims()는 WebCrypto(crypto.subtle)가 없으면 우리가 건넨 JWKS를 버리고
// 내부적으로 getUser() 폴백을 또 호출한다 — 그러면 JWKS fetch + 폴백 호출로
// 왕복이 기존보다 오히려 늘어난다. 그 경로를 타기 전에 여기서 먼저 걸러서,
// 지원 안 되는 런타임에서는 곧장 getUser() 1회로만 끝내 최소한 기존과
// 동일한 왕복 수를 보장한다.
const hasWebCrypto =
  typeof globalThis.crypto?.subtle?.importKey === "function";

const ADMIN_EMAIL_DOMAIN = "legacyedu.local";

export function isAdmin(user: { email: string | null } | null) {
  const adminUsername = process.env.ADMIN_USERNAME;
  return (
    Boolean(adminUsername) &&
    user?.email === `${adminUsername}@${ADMIN_EMAIL_DOMAIN}`
  );
}

// Server Action은 페이지 렌더링(및 app/admin/layout.tsx의 관리자 체크)을
// 거치지 않고 Next-Action 헤더가 붙은 별도 POST로 직접 호출될 수 있다.
// 그래서 모든 admin "use server" 액션은 DB 작업 전에 이 함수를 호출해
// 인가를 다시 확인해야 한다.
export async function requireAdmin() {
  const user = await getAuthUser();

  if (!isAdmin(user)) {
    throw new Error("관리자만 사용할 수 있습니다.");
  }

  return user;
}

// 같은 요청 안에서 레이아웃(Header)과 페이지가 각자 호출해도 React cache()로
// 요청 1회당 1번만 실제로 검증되게 한다.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();

  if (!hasWebCrypto) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  }

  const jwks = await getCachedJwks();
  const { data } = await supabase.auth.getClaims(undefined, { jwks });
  if (!data) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
});
