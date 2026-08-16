import { Suspense } from "react";
import Link from "next/link";
import ReviewSection from "@/components/home/ReviewSection";
import VideoSection from "@/components/home/VideoSection";
import CurriculumSection from "@/components/home/CurriculumSection";
import CurriculumStickyNav from "@/components/home/CurriculumStickyNav";
import MyCoursesStrip from "@/components/home/MyCoursesStrip";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { CONTENT_DEFAULTS, type SiteContentMap } from "@/app/admin/content/keys";

const EMAIL_DOMAIN = "legacyedu.local";

interface Enrollment {
  courses: {
    id: string;
    subject: string;
    title: string;
    teacher_name: string;
  } | null;
}

// 리뷰/사이트 콘텐츠는 로그인 여부와 무관한 공개 데이터라 캐시한다.
// 이 부분이 캐시되어야 홈페이지가 정적 셸로 즉시 서빙될 수 있다.
async function getHomeContent() {
  "use cache";
  const supabase = createPublicClient();

  const [{ data: reviews }, { data: contentRows }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, name, school, subject, summary, detail")
      .order("created_at", { ascending: false }),
    supabase.from("site_content").select("key, value"),
  ]);

  const content: SiteContentMap = { ...CONTENT_DEFAULTS };
  for (const row of contentRows ?? []) {
    if (row.key in content) {
      content[row.key as keyof SiteContentMap] = row.value;
    }
  }

  return { reviews: reviews ?? [], content };
}

export default async function HomePage() {
  const { reviews, content } = await getHomeContent();

  const curriculumSteps = [1, 2, 3, 4, 5, 6].map((n) => ({
    no: String(n).padStart(2, "0"),
    title: content[`curriculum_step${n}_title` as keyof SiteContentMap],
    subtitle: content[`curriculum_step${n}_subtitle` as keyof SiteContentMap],
    description: content[`curriculum_step${n}_desc` as keyof SiteContentMap],
  }));

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-4 py-6 sm:px-6 sm:py-16 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col items-start gap-6">
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            {content.hero_heading}
            <br />
            <span className="text-brand-dark">LEGACY EDU</span>
          </h1>
          <p className="max-w-xl whitespace-pre-line text-zinc-500">
            {content.hero_subtitle}
          </p>

          {/* 로그인 여부에 따라 달라지는 부분만 스트리밍으로 분리 */}
          <Suspense fallback={null}>
            <HomeUserSection />
          </Suspense>
        </div>
      </section>

      <VideoSection />
      <CurriculumStickyNav steps={curriculumSteps} />
      <CurriculumSection
        intro={content.curriculum_intro}
        steps={curriculumSteps}
      />
      <ReviewSection reviews={reviews} />
    </div>
  );
}

async function HomeUserSection() {
  const supabase = await createClient();
  const user = await getAuthUser();

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
    <>
      {!user && (
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/consultation"
            className="rounded-md border border-zinc-300 px-8 py-4 text-base font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
          >
            상담 신청하기
          </Link>
        </div>
      )}
      {myCourses.length > 0 && <MyCoursesStrip courses={myCourses} />}
    </>
  );
}
