"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestPasswordReset, type FindPasswordState } from "./actions";
import { formatPhoneInput } from "@/lib/phone";

const initialState: FindPasswordState = {};

export default function FindPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const [phone, setPhone] = useState("");

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">비밀번호 찾기</h1>
        <p className="mt-2 text-sm text-zinc-500">
          가입 시 등록한 이름, 본인 전화번호, 아이디를 입력해주세요. 확인 후
          연락드립니다.
        </p>
      </div>

      {state.success ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-brand/25 bg-brand-light/40 p-6 text-center">
          <p className="text-base font-bold text-brand-dark">
            요청이 접수됐습니다.
          </p>
          <p className="text-sm text-zinc-600">
            본인 확인 후 등록하신 연락처로 안내드리겠습니다.
          </p>
          <Link
            href="/login"
            className="mt-2 w-full rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            로그인 화면으로
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            이름
            <input
              name="name"
              required
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
            {isPending ? "접수 중..." : "비밀번호 재설정 요청"}
          </button>
        </form>
      )}
    </section>
  );
}
