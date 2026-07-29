import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditUserForm from "./EditUserForm";
import DeleteUserButton from "../DeleteUserButton";
import { deleteUserAndRedirect } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("profiles")
    .select("id, username, name, phone, address, school, grade")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/users"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 회원 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">{user.name} 회원 정보 수정</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        회원 정보를 수정하거나 계정을 탈퇴 처리할 수 있습니다.
      </p>

      <div className="mt-6 max-w-lg">
        <EditUserForm user={user} />
      </div>

      <div className="mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          탈퇴 처리하면 로그인 계정과 프로필, 수강 등록 정보가 모두 삭제되며
          되돌릴 수 없습니다.
        </p>
        <div className="mt-3">
          <DeleteUserButton
            action={deleteUserAndRedirect.bind(null, user.id)}
            label="회원 탈퇴 처리"
            variant="button"
          />
        </div>
      </div>
    </div>
  );
}
