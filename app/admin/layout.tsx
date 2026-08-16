import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/layout/AdminSidebar";

const EMAIL_DOMAIN = "legacyedu.local";

// 관리자 화면은 전부 로그인 필수라 캐시할 이유가 없다. 최상단에 Suspense
// 경계 하나만 두고, 인증 확인부터 페이지 본문까지 전부 그 안에서
// 요청마다 새로 렌더링되게 한다 (기존 동작과 동일, 빌드 요건만 충족).
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

function AdminLayoutFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-400">
      불러오는 중...
    </div>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  const adminUsername = process.env.ADMIN_USERNAME;
  const isAdmin =
    Boolean(adminUsername) &&
    user?.email === `${adminUsername}@${EMAIL_DOMAIN}`;

  if (!isAdmin) {
    redirect("/login");
  }

  const adminSupabase = createAdminClient();

  // 서로 무관한 두 집계 쿼리라 병렬로 요청한다.
  const [{ data: newNote }, { count: pendingConsultationCount }] =
    await Promise.all([
      adminSupabase
        .from("questions")
        .select("id")
        .is("question_read_at", null)
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from("consultation_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar
        hasNewNote={Boolean(newNote)}
        pendingConsultationCount={pendingConsultationCount ?? 0}
      />
      <div className="flex flex-1 flex-col bg-zinc-50">{children}</div>
    </div>
  );
}
