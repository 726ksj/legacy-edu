import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EditProfileForm from "./EditProfileForm";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, name, phone, guardian_phone, address, school, grade, email, member_code_id, role",
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // member_codes는 RLS에 select 정책이 없어 서비스롤로만 조회할 수 있다
  // (다른 관리자 전용 테이블들과 동일한 패턴).
  let memberCode: string | null = null;
  if (profile.member_code_id) {
    const adminSupabase = createAdminClient();
    const { data: codeRow } = await adminSupabase
      .from("member_codes")
      .select("code")
      .eq("id", profile.member_code_id)
      .maybeSingle();
    memberCode = codeRow?.code ?? null;
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Settings
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          회원정보 관리
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          가입 시 등록한 정보를 확인하고 직접 수정할 수 있습니다.
        </p>
      </div>

      <EditProfileForm profile={profile} memberCode={memberCode} />
      <ChangePasswordForm />
    </section>
  );
}
