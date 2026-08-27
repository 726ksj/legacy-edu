"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword, type ChangePasswordState } from "./actions";
import { PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";

const initialState: ChangePasswordState = {};

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <p className="text-sm font-semibold text-zinc-900">비밀번호 변경</p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        현재 비밀번호
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        새 비밀번호
        <span className="text-xs font-normal text-zinc-400">
          {PASSWORD_REQUIREMENT_TEXT}
        </span>
        <input
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          새 비밀번호 확인
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        {passwordMismatch && (
          <p className="text-xs font-medium text-red-500">
            비밀번호가 일치하지 않습니다.
          </p>
        )}
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">
          비밀번호가 변경되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || passwordMismatch}
        className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
