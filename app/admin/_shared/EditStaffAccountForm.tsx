"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/formatPhone";
import {
  updateStaffAccount,
  type UpdateStaffAccountState,
} from "./staff-account-actions";
import type { StaffRole } from "@/lib/staffAccounts";

const initialState: UpdateStaffAccountState = {};

interface StaffAccountData {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string | null;
}

export default function EditStaffAccountForm({
  role,
  account,
}: {
  role: StaffRole;
  account: StaffAccountData;
}) {
  const boundUpdate = updateStaffAccount.bind(null, role, account.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdate,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        아이디 (수정 불가)
        <input
          value={account.username}
          disabled
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이름
        <input
          name="name"
          defaultValue={account.name}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        전화번호
        <input
          name="phone"
          type="tel"
          defaultValue={formatPhone(account.phone)}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이메일
        <input
          name="email"
          type="email"
          defaultValue={account.email ?? ""}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark sm:col-span-2">
          저장되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:col-span-2 sm:self-start"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
