"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState, useRef, useState } from "react";
import { signup, type SignupState } from "./actions";
import { PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";

const initialState: SignupState = {};

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; roadAddress: string }) => void;
      }) => { embed: (container: HTMLElement) => void };
    };
  }
}

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, initialState);
  const [zonecode, setZonecode] = useState("");
  const [roadAddress, setRoadAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const postcodeContainerRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const fullAddress =
    [roadAddress, detailAddress].filter(Boolean).join(" ") +
    (zonecode ? ` (${zonecode})` : "");

  function openAddressSearch() {
    setSearchOpen(true);
  }

  // 팝업 창 대신 모달 안에 검색창을 직접 그려서, 팝업 차단의 영향을 받지 않게 함
  function mountPostcode(container: HTMLDivElement | null) {
    postcodeContainerRef.current = container;
    if (!container || !window.daum) return;
    container.innerHTML = "";
    new window.daum.Postcode({
      oncomplete: (data) => {
        setZonecode(data.zonecode);
        setRoadAddress(data.roadAddress);
        setSearchOpen(false);
      },
    }).embed(container);
  }

  if (state.success) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-6 text-center sm:px-6 sm:py-16">
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
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">회원가입</h1>
        <p className="mt-2 text-sm text-zinc-500">
          학원에서 상담 후 받은 학생코드를 입력해야 가입할 수 있습니다.
        </p>
      </div>

      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="이름" name="name" />

        <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          주소
          <div className="flex gap-2">
            <input
              value={zonecode}
              readOnly
              placeholder="우편번호"
              className="w-24 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none"
            />
            <button
              type="button"
              onClick={openAddressSearch}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
            >
              주소 검색
            </button>
          </div>
          <input
            value={roadAddress}
            readOnly
            placeholder="주소 검색을 눌러주세요"
            className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none"
          />
          <input
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            placeholder="상세주소 (동/호수 등)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          />
          <input type="hidden" name="address" value={fullAddress} />
        </div>

        {searchOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white p-4 text-left shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-zinc-900">주소 검색</p>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  닫기
                </button>
              </div>
              <div ref={mountPostcode} className="h-96 w-full" />
            </div>
          </div>
        )}

        <Field
          label="본인 전화번호"
          name="phone"
          type="tel"
          placeholder="010-0000-0000"
        />
        <Field
          label="보호자 전화번호"
          name="guardianPhone"
          type="tel"
          placeholder="010-0000-0000"
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="학교" name="school" placeholder="예: 분당고등학교" />
          </div>
          <div className="w-24">
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
          </div>
        </div>
        <Field label="아이디" name="username" />
        <div className="flex flex-col gap-1.5">
          <Field
            label="비밀번호"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-zinc-400">{PASSWORD_REQUIREMENT_TEXT}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Field
            label="비밀번호 확인"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {passwordMismatch && (
            <p className="text-xs font-medium text-red-500">
              비밀번호가 일치하지 않습니다.
            </p>
          )}
        </div>
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
          disabled={isPending || passwordMismatch}
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
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
      />
    </label>
  );
}
