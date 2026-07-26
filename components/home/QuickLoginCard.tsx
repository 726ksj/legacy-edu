"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/(main)/login/actions";

const initialState: LoginState = {};

export default function QuickLoginCard() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">업적을 쌓는 시간,</p>
      <p className="text-lg font-bold text-brand-dark">LEGACY EDU 로그인</p>

      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <input
          type="text"
          name="username"
          placeholder="아이디"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />

        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <Link
        href="/signup"
        className="mt-3 block rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
      >
        회원가입
      </Link>

      <div className="mt-4 flex items-center justify-center gap-3 text-xs text-zinc-400">
        <Link href="/find-id" className="hover:text-brand-dark">
          아이디 찾기
        </Link>
        <span>│</span>
        <Link href="/find-password" className="hover:text-brand-dark">
          비밀번호 찾기
        </Link>
      </div>
    </div>
  );
}
