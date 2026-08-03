import Link from "next/link";
import ReviewSection from "@/components/home/ReviewSection";
import VideoSection from "@/components/home/VideoSection";
import CurriculumSection from "@/components/home/CurriculumSection";
import MyCoursesStrip from "@/components/home/MyCoursesStrip";
import { createClient } from "@/lib/supabase/server";
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, name, school, subject, summary, detail")
    .order("created_at", { ascending: false });

  const { data: contentRows } = await supabase
    .from("site_content")
    .select("key, value");

  const content: SiteContentMap = { ...CONTENT_DEFAULTS };
  for (const row of contentRows ?? []) {
    if (row.key in content) {
      content[row.key as keyof SiteContentMap] = row.value;
    }
  }

  const curriculumSteps = [1, 2, 3, 4, 5, 6].map((n) => ({
    no: String(n).padStart(2, "0"),
    title: content[`curriculum_step${n}_title` as keyof SiteContentMap],
    subtitle: content[`curriculum_step${n}_subtitle` as keyof SiteContentMap],
    description: content[`curriculum_step${n}_desc` as keyof SiteContentMap],
  }));

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col items-start gap-6">
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            {content.hero_heading}
            <br />
            <span className="text-brand-dark">LEGACY EDU</span>
          </h1>
          <p className="max-w-xl text-zinc-500">{content.hero_subtitle}</p>
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
        </div>
      </section>

      <ReviewSection reviews={reviews ?? []} />
      <VideoSection />
      <CurriculumSection
        intro={content.curriculum_intro}
        steps={curriculumSteps}
      />
    </div>
  );
}
