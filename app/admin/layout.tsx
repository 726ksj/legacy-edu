import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/layout/AdminSidebar";

const EMAIL_DOMAIN = "legacyedu.local";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
  const [{ data: newQuestion }, { count: pendingConsultationCount }] =
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
        hasNewQuestion={Boolean(newQuestion)}
        pendingConsultationCount={pendingConsultationCount ?? 0}
      />
      <div className="flex flex-1 flex-col bg-zinc-50">{children}</div>
    </div>
  );
}
