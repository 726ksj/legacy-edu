import { getStaffAccounts } from "@/lib/staffAccounts";
import StaffAccountsTable from "../_shared/StaffAccountsTable";

export const dynamic = "force-dynamic";

export default async function Page() {
  const accounts = await getStaffAccounts("assistant");

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">조교 계정 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        가입한 조교 로그인 계정을 확인/수정/삭제하는 페이지입니다. 강좌
        배정은 강좌 관리에서 합니다.
      </p>

      <StaffAccountsTable
        accounts={accounts}
        basePath="/admin/assistant-accounts"
      />
    </div>
  );
}
