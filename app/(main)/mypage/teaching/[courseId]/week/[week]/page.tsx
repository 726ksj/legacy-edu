import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { parseWeekParam, weekDateRange } from "@/lib/weeks";
import LessonsSection from "@/components/teaching/LessonsSection";
import VocabSection from "@/components/teaching/VocabSection";
import FeatureTabs from "@/components/teaching/FeatureTabs";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; week: string }>;
}) {
  const { courseId, week: weekParam } = await params;
  const week = parseWeekParam(weekParam);
  if (week === undefined) {
    notFound();
  }

  // 관리자 또는 이 강좌에 배정된 강사만 들어올 수 있다.
  try {
    await requireCourseManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title, start_date")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const title = week === null ? "주차 미지정" : `${week}주차`;
  const range = week === null ? null : weekDateRange(course.start_date, week);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <Link
          href={`/mypage/teaching/${courseId}`}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← [{course.subject}] {course.title}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">{title}</h1>
        {range && <p className="mt-1 text-sm text-zinc-500">{range}</p>}
        {week === null && (
          <p className="mt-1 text-sm text-zinc-500">
            주차를 지정하지 않은 영상과 단어장입니다. 수정에서 주차를 지정하면
            해당 주차로 옮겨집니다.
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">영상 관리</h2>
        <LessonsSection courseId={courseId} week={week} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">단어 관리</h2>
        <FeatureTabs
          tabs={[
            {
              key: "voca",
              label: "단어(VOCA)",
              content: <VocabSection courseId={courseId} week={week} />,
            },
            { key: "writing", label: "서술형", content: null },
            { key: "order", label: "순서 암기", content: null },
            { key: "grammar", label: "어법 선택", content: null },
          ]}
        />
      </section>
    </div>
  );
}
