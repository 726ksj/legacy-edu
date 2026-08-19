import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;

  if (!courseId) {
    notFound();
  }

  const user = await getAuthUser();
  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/checkout?courseId=${courseId}`)}`,
    );
  }

  // 강좌 카탈로그와 동일하게 courses 테이블 RLS가 익명/일반 사용자 조회를
  // 막고 있어서, 서버 전용 admin 클라이언트로 결제에 필요한 컬럼만 select한다.
  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, teacher_name, title, school, price")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

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
        <p className="text-sm text-zinc-500">
          {course.subject} · {course.teacher_name}
          {course.school ? ` · ${course.school}` : ""}
        </p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">
          {course.title}
        </p>
        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
          <span className="text-sm font-medium text-zinc-500">결제 금액</span>
          <span className="text-xl font-bold text-zinc-900">
            {course.price.toLocaleString("ko-KR")}원
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled
        title="결제 연동 준비 중입니다."
        className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white opacity-60"
      >
        결제하기 (준비 중)
      </button>

      <Link
        href={`/courses/${course.id}`}
        className="text-sm text-zinc-500 hover:text-brand-dark"
      >
        ← 강좌 상세로 돌아가기
      </Link>
    </section>
  );
}
