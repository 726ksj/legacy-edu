import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-bold text-brand-dark">LEGACY EDU</p>
            <p className="mt-2 text-sm text-zinc-500">
              분당 · 성남 · 수지 고등학생 내신 및 수능 전문 교육
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              (임시) 주소 · 사업자등록번호 · 대표자명 등 정보 영역
            </p>
          </div>

          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-zinc-700">바로가기</span>
              <Link href="/about" className="text-zinc-500 hover:text-brand-dark">
                LEGACY 소개
              </Link>
              <Link href="/notice" className="text-zinc-500 hover:text-brand-dark">
                NOTICE
              </Link>
              <Link href="/consultation" className="text-zinc-500 hover:text-brand-dark">
                상담 신청
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-zinc-700">고객지원</span>
              <Link href="/customer-center" className="text-zinc-500 hover:text-brand-dark">
                고객센터 / FAQ
              </Link>
              <Link href="/signup" className="text-zinc-500 hover:text-brand-dark">
                회원가입
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-zinc-400">
          © {new Date().getFullYear()} LEGACY EDU. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
