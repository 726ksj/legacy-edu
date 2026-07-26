import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";

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
    .select("username, name, phone, address, created_at")
    .eq("id", user.id)
    .single();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-24 sm:px-6">
      <div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          /mypage
        </span>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">
          {profile?.name ?? profile?.username}님, 안녕하세요
        </h1>
      </div>

      <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white px-6">
        <Row label="이름" value={profile?.name} />
        <Row label="아이디" value={profile?.username} />
        <Row label="전화번호" value={profile?.phone} />
        <Row label="주소" value={profile?.address} />
      </dl>

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

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-3 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">{value ?? "-"}</dd>
    </div>
  );
}
