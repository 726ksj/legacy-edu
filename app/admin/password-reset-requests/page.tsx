import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  markPasswordResetComplete,
  deletePasswordResetRequest,
} from "./actions";
import DeleteRequestButton from "./DeleteRequestButton";

export const dynamic = "force-dynamic";

interface PasswordResetRequestRow {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  username: string;
  status: string;
  created_at: string;
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: requests, error } = await supabase
    .from("password_reset_requests")
    .select("id, profile_id, name, phone, username, status, created_at")
    .order("created_at", { ascending: false })
    .returns<PasswordResetRequestRow[]>();

  const pendingCount = (requests ?? []).filter(
    (row) => row.status === "pending",
  ).length;

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        비밀번호 찾기 요청 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        회원이 제출한 비밀번호 재설정 요청입니다. 전화로 본인 확인 후, 회원
        상세 페이지에서 비밀번호를 초기화하고 처리완료로 표시해주세요.
        {pendingCount > 0 && (
          <span className="ml-2 font-semibold text-brand-dark">
            대기중 {pendingCount}건
          </span>
        )}
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
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                <span
                  className={
                    row.status === "pending"
                      ? "rounded-full bg-brand-light px-2 py-0.5 font-semibold text-brand-dark"
                      : "rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500"
                  }
                >
                  {row.status === "pending" ? "대기중" : "처리완료"}
                </span>
                <span>
                  {row.name} · 아이디 {row.username} · {row.phone}
                </span>
              </div>
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
              {row.status === "pending" && (
                <form
                  action={markPasswordResetComplete.bind(null, row.id)}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
                  >
                    처리완료로 표시
                  </button>
                </form>
              )}
              <DeleteRequestButton
                action={deletePasswordResetRequest.bind(null, row.id)}
              />
            </div>
          </div>
        ))}
        {requests?.length === 0 && (
          <p className="text-sm text-zinc-400">
            접수된 비밀번호 찾기 요청이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
