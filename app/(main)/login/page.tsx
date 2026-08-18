"use client";

import { useActionState, useEffect, useState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};
const SAVED_USERNAME_KEY = "legacy-edu:saved-username";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [username, setUsername] = useState("");
  const [rememberId, setRememberId] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_USERNAME_KEY);
    if (saved) {
      setUsername(saved);
      setRememberId(true);
    }
  }, []);

  const handleSubmit = () => {
    if (rememberId) {
      localStorage.setItem(SAVED_USERNAME_KEY, username);
    } else {
      localStorage.removeItem(SAVED_USERNAME_KEY);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">로그인</h1>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          아이디
          <input
            name="username"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          비밀번호
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={rememberId}
            onChange={(e) => setRememberId(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          아이디 저장
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
