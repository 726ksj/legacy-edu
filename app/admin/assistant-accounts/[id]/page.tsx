import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffAccountDetail } from "@/lib/staffAccounts";
import EditStaffAccountForm from "../../_shared/EditStaffAccountForm";
import StaffDeviceSection from "../../_shared/StaffDeviceSection";
import DeleteStaffAccountButton from "../../_shared/DeleteStaffAccountButton";

export const dynamic = "force-dynamic";

interface DeviceRow {
  id: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getStaffAccountDetail(id, "assistant");

  if (!account) {
    notFound();
  }

  const supabase = createAdminClient();
  const { data: devices } = await supabase
    .from("user_devices")
    .select("id, user_agent, created_at, last_seen_at")
    .eq("user_id", id)
    .order("last_seen_at", { ascending: false })
    .returns<DeviceRow[]>();

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/assistant-accounts"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 조교 계정 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">
        {account.name} 조교 계정 정보
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">계정 정보</h2>
            <div className="mt-3">
              <EditStaffAccountForm role="assistant" account={account} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900">기기 관리</h2>
            <div className="mt-3">
              <StaffDeviceSection
                role="assistant"
                userId={account.id}
                devices={devices ?? []}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-900">배정된 강좌</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {account.courses.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">
                배정된 강좌가 없습니다.
              </p>
            )}
            {account.courses.length > 0 && (
              <ul className="divide-y divide-zinc-100">
                {account.courses.map((course) => (
                  <li key={course.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-zinc-900">
                      [{course.subject}] {course.title}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-4xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          탈퇴 처리하면 로그인 계정과 프로필, 강좌 배정 정보가 모두 삭제되며
          되돌릴 수 없습니다.
        </p>
        <div className="mt-3">
          <DeleteStaffAccountButton role="assistant" accountId={account.id} />
        </div>
      </div>
    </div>
  );
}
