"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-6">
      <div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          /login
        </span>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">로그인</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          아이디
          <input
            name="username"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          비밀번호
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>

        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </section>
  );
}
