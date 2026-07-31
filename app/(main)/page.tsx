import Link from "next/link";
import ReviewSection from "@/components/home/ReviewSection";
import VideoSection from "@/components/home/VideoSection";
import CurriculumSection from "@/components/home/CurriculumSection";
import MyCoursesStrip from "@/components/home/MyCoursesStrip";
import { createClient } from "@/lib/supabase/server";

const EMAIL_DOMAIN = "legacyedu.local";

interface Enrollment {
  courses: {
    id: string;
    subject: string;
    title: string;
    teacher_name: string;
  } | null;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin =
    Boolean(process.env.ADMIN_USERNAME) &&
    user?.email === `${process.env.ADMIN_USERNAME}@${EMAIL_DOMAIN}`;

  let myCourses: NonNullable<Enrollment["courses"]>[] = [];
  if (user && !isAdmin) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("courses(id, subject, title, teacher_name)")
      .eq("profile_id", user.id)
      .returns<Enrollment[]>();
    myCourses = (enrollments ?? [])
      .map((enrollment) => enrollment.courses)
      .filter((course): course is NonNullable<typeof course> => Boolean(course));
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col items-start gap-6">
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
          {myCourses.length > 0 && <MyCoursesStrip courses={myCourses} />}
        </div>
      </section>

      <ReviewSection />
      <VideoSection />
      <CurriculumSection />
    </div>
  );
}
