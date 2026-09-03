"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { findId, type FindIdState } from "./actions";
import { formatPhoneInput } from "@/lib/phone";
import { ArrowLeft, CheckCircle2, Phone, User } from "lucide-react";

const initialState: FindIdState = {};

export default function FindIdForm() {
  const [state, formAction, isPending] = useActionState(findId, initialState);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-20">
      <Link
        href="/login"
        className="mb-6 flex w-fit items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-brand-dark"
      >
        <ArrowLeft className="h-4 w-4" />
        로그인으로 돌아가기
      </Link>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {state.sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light">
              <CheckCircle2 className="h-7 w-7 text-brand-dark" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">
                이메일을 확인해주세요
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                입력하신 정보와 일치하는 계정이 있다면,
                <br />
                등록된 이메일로 아이디를 보내드렸습니다.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 w-full rounded-lg bg-brand px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
                <User className="h-6 w-6 text-brand-dark" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">
                  아이디 찾기
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                  가입 시 등록한 이름과 전화번호를 입력하시면
                  <br />
                  등록된 이메일로 아이디를 보내드려요.
                </p>
              </div>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
                이름
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition-colors focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
                본인 전화번호
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition-colors focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </label>

              {state.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-500">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="mt-1 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {isPending ? "확인 중..." : "아이디 찾기"}
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link
                href="/find-password"
                className="text-xs font-medium text-zinc-400 transition-colors hover:text-brand-dark"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
