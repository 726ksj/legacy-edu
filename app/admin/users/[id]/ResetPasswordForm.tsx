"use client";

import { useActionState, useRef, useState } from "react";
import { resetUserPassword, type ResetPasswordState } from "../actions";
import { generateRandomPassword } from "@/lib/random-password";

const initialState: ResetPasswordState = {};

export default function ResetPasswordForm({ userId }: { userId: string }) {
  const boundReset = resetUserPassword.bind(null, userId);
  const [state, formAction, isPending] = useActionState(
    boundReset,
    initialState,
  );
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <p className="text-sm font-semibold text-zinc-900">비밀번호 재설정</p>
      <p className="text-xs text-zinc-500">
        학생이 비밀번호를 잊어버렸을 때, 새 비밀번호를 정해서 알려줄 수
        있습니다.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        새 비밀번호
        <div className="flex gap-2">
          <input
            ref={inputRef}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setPassword(generateRandomPassword())}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
          >
            자동 생성
          </button>
        </div>
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">
          비밀번호가 변경되었습니다. 학생에게 새 비밀번호를 전달해주세요.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
