import Link from "next/link";

const REPORT_LINKS = [
  { label: "단어 테스트", href: "/mypage/score-report/vocabulary" },
  { label: "학원 모의고사", href: "/mypage/score-report/academy-mock-exam" },
  {
    label: "교육청/평가원 모의고사",
    href: "/mypage/score-report/official-mock-exam",
  },
  { label: "중간고사/기말고사", href: "/mypage/score-report/midterm-final" },
];

export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start px-4 py-6 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
        점수 리포트
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-500">
        영역별 성적 리포트를 확인할 수 있는 페이지입니다.
      </p>

      <ul className="mt-8 grid w-full max-w-md gap-3">
        {REPORT_LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-zinc-400">
        (임시 화면입니다. 실제 기능은 다음 단계에서 구현됩니다.)
      </p>
    </section>
  );
}
