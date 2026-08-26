"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { findId, type FindIdState } from "./actions";
import { formatPhoneInput } from "@/lib/phone";

const initialState: FindIdState = {};

export default function FindIdForm() {
  const [state, formAction, isPending] = useActionState(findId, initialState);
  const [phone, setPhone] = useState("");

  return (
    <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">아이디 찾기</h1>
        <p className="mt-2 text-sm text-zinc-500">
          가입 시 등록한 이름과 본인 전화번호를 입력해주세요.
        </p>
      </div>

      {state.username ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-brand/25 bg-brand-light/40 p-6 text-center">
          <p className="text-sm text-zinc-600">회원님의 아이디는</p>
          <p className="text-2xl font-bold text-brand-dark">
            {state.username}
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

          {state.error && (
            <p className="text-sm font-medium text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "확인 중..." : "아이디 찾기"}
          </button>
        </form>
      )}
    </section>
  );
}
