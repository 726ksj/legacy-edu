"use client";

import { useActionState } from "react";
import {
  deleteStaffAccount,
  type DeleteStaffAccountState,
} from "./staff-account-actions";
import type { StaffRole } from "@/lib/staffAccounts";

const initialState: DeleteStaffAccountState = {};

const ROLE_LABEL: Record<StaffRole, string> = {
  teacher: "강사",
  assistant: "조교",
};

export default function DeleteStaffAccountButton({
  role,
  accountId,
}: {
  role: StaffRole;
  accountId: string;
}) {
  const boundDelete = deleteStaffAccount.bind(null, role, accountId);
  const [state, formAction, isPending] = useActionState(
    boundDelete,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `이 ${ROLE_LABEL[role]} 계정을 탈퇴 처리할까요? 로그인 계정과 프로필, 강좌 배정 정보가 모두 삭제되며 되돌릴 수 없습니다.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
      >
        {isPending ? "처리 중..." : "계정 탈퇴 처리"}
      </button>
      {state.error && (
        <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>
      )}
    </form>
  );
}
