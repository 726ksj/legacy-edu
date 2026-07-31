import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";
import EditProfileForm from "./EditProfileForm";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, name, phone, address, school, grade")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-24 sm:px-6">
      <div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          /mypage
        </span>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">
          {profile.name}님, 안녕하세요
        </h1>
      </div>

      <EditProfileForm profile={profile} />

      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          로그아웃
        </button>
      </form>
    </section>
  );
}
