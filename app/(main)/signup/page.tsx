"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  if (state.success) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">회원가입 완료</h1>
        <p className="text-zinc-500">가입이 완료되었습니다. 로그인해주세요.</p>
        <Link
          href="/login"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          로그인하러 가기
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">회원가입</h1>
        <p className="mt-2 text-sm text-zinc-500">
          학원에서 상담 후 받은 학생코드를 입력해야 가입할 수 있습니다.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="이름" name="name" />
        <Field label="주소" name="address" />
        <Field label="전화번호" name="phone" type="tel" />
        <Field label="학교" name="school" placeholder="예: 분당고등학교" />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          학년
          <select
            name="grade"
            required
            defaultValue=""
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="" disabled>
              선택
            </option>
            <option value="고1">고1</option>
            <option value="고2">고2</option>
            <option value="고3">고3</option>
          </select>
        </label>
        <Field label="아이디" name="username" />
        <Field label="비밀번호" name="password" type="password" />
        <Field
          label="학생코드"
          name="studentCode"
          placeholder="학원에서 받은 코드를 입력하세요"
        />

        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "가입 처리 중..." : "회원가입"}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
      />
    </label>
  );
}
