import Link from "next/link";
import ReviewSection from "@/components/home/ReviewSection";
import VideoSection from "@/components/home/VideoSection";
import CurriculumSection from "@/components/home/CurriculumSection";
import { createClient } from "@/lib/supabase/server";

const EMAIL_DOMAIN = "legacyedu.local";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin =
    Boolean(process.env.ADMIN_USERNAME) &&
    user?.email === `${process.env.ADMIN_USERNAME}@${EMAIL_DOMAIN}`;

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-4 py-24 sm:px-6 lg:flex-row lg:items-center">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
            /
          </span>
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            고등 내신 &amp; 수능 전문
            <br />
            <span className="text-brand-dark">LEGACY EDU</span>
          </h1>
          <p className="max-w-xl text-zinc-500">
            내신 전교 1등 maker! 압도적인 강의력, 꼼꼼한 관리로 학생 한 명
            한 명의 배움의 자산(legacy)을 함께 만들어갑니다.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/about"
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
            >
              LEGACY 소개
            </Link>
          </div>
        </div>

        {isAdmin && (
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              관리자로 로그인 중입니다
            </p>
            <p className="text-lg font-bold text-brand-dark">LEGACY EDU</p>
            <Link
              href="/admin"
              className="mt-4 block rounded-md bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              관리자 모드로 이동
            </Link>
          </div>
        )}
      </section>

      <ReviewSection />
      <VideoSection />
      <CurriculumSection />
    </div>
  );
}
