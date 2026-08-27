import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
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
    .select("username, name, phone, guardian_phone, address, school, grade")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">회원정보 관리</h1>
        <p className="mt-2 text-sm text-zinc-500">
          가입 시 등록한 정보를 확인하고 직접 수정할 수 있습니다.
        </p>
      </div>

      <EditProfileForm profile={profile} />
      <ChangePasswordForm />
    </section>
  );
}
