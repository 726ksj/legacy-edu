import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PaymentWidgetSection from "./PaymentWidgetSection";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; courseIds?: string }>;
}) {
  const { courseId, courseIds: courseIdsParam } = await searchParams;
  const ids = courseIdsParam
    ? courseIdsParam.split(",").filter(Boolean)
    : courseId
      ? [courseId]
      : [];

  if (ids.length === 0) {
    notFound();
  }

  const user = await getAuthUser();
  if (!user) {
    const query = courseIdsParam
      ? `courseIds=${encodeURIComponent(courseIdsParam)}`
      : `courseId=${encodeURIComponent(courseId!)}`;
    redirect(`/login?redirect=${encodeURIComponent(`/checkout?${query}`)}`);
  }

  // 강좌 카탈로그와 동일하게 courses 테이블 RLS가 익명/일반 사용자 조회를
  // 막고 있어서, 서버 전용 admin 클라이언트로 결제에 필요한 컬럼만 select한다.
  const supabase = createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, subject, teacher_name, title, school, price")
    .in("id", ids);

  if (!courses || courses.length === 0) {
    notFound();
  }

  const total = courses.reduce((sum, course) => sum + course.price, 0);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          주문/결제
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          선택한 강좌를 확인하고 결제를 진행하세요.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-4 divide-y divide-zinc-100">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-start justify-between gap-4 pt-4 first:pt-0"
            >
              <div>
                <p className="text-sm text-zinc-500">
                  {course.subject} · {course.teacher_name}
                  {course.school ? ` · ${course.school}` : ""}
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-900">
                  {course.title}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-zinc-700">
                {course.price.toLocaleString("ko-KR")}원
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
          <span className="text-sm font-medium text-zinc-500">결제 금액</span>
          <span className="text-xl font-bold text-zinc-900">
            {total.toLocaleString("ko-KR")}원
          </span>
        </div>
      </div>

      <PaymentWidgetSection
        courseIds={courses.map((course) => course.id)}
        amount={total}
      />

      <Link
        href={courses.length === 1 ? `/courses/${courses[0].id}` : "/courses/high"}
        className="text-sm text-zinc-500 hover:text-brand-dark"
      >
        ← {courses.length === 1 ? "강좌 상세로" : "강좌 목록으로"} 돌아가기
      </Link>
    </section>
  );
}
