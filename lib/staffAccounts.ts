import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffRole = "teacher" | "assistant";

export interface StaffAccountRow {
  id: string;
  name: string;
  username: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export async function getStaffAccounts(
  role: StaffRole,
): Promise<StaffAccountRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, username, phone, email, created_at")
    .eq("role", role)
    .order("created_at", { ascending: false })
    .returns<StaffAccountRow[]>();
  return data ?? [];
}

export interface StaffAccountDetail extends StaffAccountRow {
  courses: { id: string; subject: string; title: string }[];
}

export async function getStaffAccountDetail(
  id: string,
  role: StaffRole,
): Promise<StaffAccountDetail | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, username, phone, email, created_at")
    .eq("id", id)
    .eq("role", role)
    .maybeSingle<StaffAccountRow>();

  if (!profile) return null;

  const { data: assignments } = await supabase
    .from("course_teachers")
    .select("courses(id, subject, title)")
    .eq("profile_id", id)
    .eq("role", role)
    .returns<{ courses: { id: string; subject: string; title: string } | null }[]>();

  return {
    ...profile,
    courses: (assignments ?? [])
      .map((row) => row.courses)
      .filter((course): course is { id: string; subject: string; title: string } =>
        Boolean(course),
      ),
  };
}
