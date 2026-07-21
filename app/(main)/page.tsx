import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-6 px-4 py-24 sm:px-6">
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          /
        </span>
        <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
          분당 · 성남 · 수지 고등 내신 &amp; 수능 전문
          <br />
          <span className="text-brand-dark">LEGACY EDU</span>
        </h1>
        <p className="max-w-xl text-zinc-500">
          메인 홈페이지 임시 화면입니다. 상담 신청, 수강생 리뷰, NOTICE 등
          실제 콘텐츠는 다음 단계에서 채워집니다.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/consultation"
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            상담 신청하기 go! go!
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
          >
            LEGACY 소개
          </Link>
        </div>
        <p className="pt-8 text-sm text-zinc-400">
          (임시 화면입니다. 실제 기능은 다음 단계에서 구현됩니다.)
        </p>
      </section>
    </div>
  );
}
