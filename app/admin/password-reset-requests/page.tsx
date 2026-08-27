import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletePasswordResetRequest } from "./actions";
import DeleteRequestButton from "./DeleteRequestButton";

export const dynamic = "force-dynamic";

interface PasswordResetRequestRow {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  username: string;
  created_at: string;
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: requests, error } = await supabase
    .from("password_reset_requests")
    .select("id, profile_id, name, phone, username, created_at")
    .order("created_at", { ascending: false })
    .returns<PasswordResetRequestRow[]>();

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        비밀번호 셀프 재설정 이력
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        회원이 아이디/비밀번호 찾기 화면에서 본인 확인 후 직접 비밀번호를
        재설정한 기록입니다. 관리자가 따로 처리할 건 없고, 확인용 이력입니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {requests?.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500">
                {row.name} · 아이디 {row.username} · {row.phone}
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(row.created_at).toLocaleString("ko-KR")}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Link
                href={`/admin/users/${row.profile_id}`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
              >
                회원 상세로 이동
              </Link>
              <DeleteRequestButton
                action={deletePasswordResetRequest.bind(null, row.id)}
              />
            </div>
          </div>
        ))}
        {requests?.length === 0 && (
          <p className="text-sm text-zinc-400">재설정 이력이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
