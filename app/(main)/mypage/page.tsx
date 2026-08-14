import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";
import EditProfileForm from "./EditProfileForm";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

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
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-24">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">
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
