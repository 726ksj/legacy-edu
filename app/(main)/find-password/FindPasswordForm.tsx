"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPasswordSelfService, type FindPasswordState } from "./actions";
import { formatPhoneInput } from "@/lib/phone";
import { PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";

const initialState: FindPasswordState = {};

export default function FindPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordSelfService,
    initialState,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">비밀번호 찾기</h1>
        <p className="mt-2 text-sm text-zinc-500">
          가입 시 등록한 이름, 본인 전화번호, 아이디를 확인한 뒤 새
          비밀번호로 바로 변경합니다.
        </p>
      </div>

      {state.success ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-brand/25 bg-brand-light/40 p-6 text-center">
          <p className="text-base font-bold text-brand-dark">
            비밀번호가 변경됐습니다.
          </p>
          <p className="text-sm text-zinc-600">
            새 비밀번호로 로그인해주세요.
          </p>
          <Link
            href="/login"
            className="mt-2 w-full rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            로그인하러 가기
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            이름
            <input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            본인 전화번호
            <input
              name="phone"
              type="tel"
              required
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            아이디
            <input
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            새 비밀번호
            <span className="text-xs font-normal text-zinc-400">
              {PASSWORD_REQUIREMENT_TEXT}
            </span>
            <input
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={isPending || passwordMismatch}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      )}
    </section>
  );
}
