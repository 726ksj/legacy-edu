import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/layout/AdminSidebar";

const EMAIL_DOMAIN = "legacyedu.local";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminUsername = process.env.ADMIN_USERNAME;
  const isAdmin =
    Boolean(adminUsername) &&
    user?.email === `${adminUsername}@${EMAIL_DOMAIN}`;

  if (!isAdmin) {
    redirect("/login");
  }

  const { data: newQuestion } = await createAdminClient()
    .from("questions")
    .select("id")
    .is("question_read_at", null)
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar hasNewQuestion={Boolean(newQuestion)} />
      <div className="flex flex-1 flex-col bg-zinc-50">{children}</div>
    </div>
  );
}
