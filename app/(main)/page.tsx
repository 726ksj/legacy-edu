import Link from "next/link";
import QuickLoginCard from "@/components/home/QuickLoginCard";
import ReviewSection from "@/components/home/ReviewSection";
import VideoSection from "@/components/home/VideoSection";
import CurriculumSection from "@/components/home/CurriculumSection";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-4 py-24 sm:px-6 lg:flex-row lg:items-center">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
            /
          </span>
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            분당 · 성남 · 수지 고등 내신 &amp; 수능 전문
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

        <QuickLoginCard />
      </section>

      <ReviewSection />
      <VideoSection />
      <CurriculumSection />
    </div>
  );
}
