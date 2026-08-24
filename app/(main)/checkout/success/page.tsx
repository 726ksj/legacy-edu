import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmTossPayment } from "@/lib/toss";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
  }>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    notFound();
  }

  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, amount, status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order || order.profile_id !== user.id) {
    notFound();
  }

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("course_id")
    .eq("order_id", order.id);

  const courseIds = (orderItems ?? []).map((item) => item.course_id);
  const retryHref =
    courseIds.length === 1
      ? `/checkout?courseId=${courseIds[0]}`
      : `/checkout?courseIds=${courseIds.join(",")}`;

  // Toss가 돌려준 URL의 amount는 클라이언트가 조작할 수 있으므로 절대
  // 신뢰하지 않고, 주문 생성 시 서버에 저장해둔 금액과 대조한 뒤 그 값으로만
  // 결제를 승인한다.
  if (order.amount !== Number(amount)) {
    return (
      <ResultSection
        title="결제 금액이 일치하지 않습니다"
        description="요청하신 결제를 처리할 수 없습니다. 다시 시도해주세요."
        retryHref={retryHref}
      />
    );
  }

  if (order.status === "paid") {
    return (
      <ResultSection
        title="이미 처리된 결제입니다"
        description="해당 주문은 이미 결제가 완료되었습니다."
        retryHref={retryHref}
        success
      />
    );
  }

  let outcome: { title: string; description: string; success?: boolean };

  try {
    const result = await confirmTossPayment({
      paymentKey,
      orderId,
      amount: order.amount,
    });

    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_key: result.paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (courseIds.length > 0) {
      const { error: enrollError } = await supabase.from("enrollments").insert(
        courseIds.map((courseId) => ({
          profile_id: order.profile_id,
          course_id: courseId,
        })),
      );

      // 23505 = 이미 등록된 강좌(unique violation) — 결제는 성공했으니 정상 처리
      if (enrollError && enrollError.code !== "23505") {
        throw new Error(enrollError.message);
      }

      await supabase
        .from("cart_items")
        .delete()
        .eq("profile_id", order.profile_id)
        .in("course_id", courseIds);
    }

    outcome = {
      title: "결제가 완료되었습니다",
      description: "이제 나의 강의실에서 바로 수강을 시작할 수 있어요.",
      success: true,
    };
  } catch (err) {
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id);

    outcome = {
      title: "결제 승인에 실패했습니다",
      description:
        err instanceof Error ? err.message : "잠시 후 다시 시도해주세요.",
    };
  }

  return (
    <ResultSection
      title={outcome.title}
      description={outcome.description}
      retryHref={retryHref}
      success={outcome.success}
    />
  );
}

function ResultSection({
  title,
  description,
  retryHref,
  success,
}: {
  title: string;
  description: string;
  retryHref: string;
  success?: boolean;
}) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500">{description}</p>
      <div className="mt-4 flex gap-3">
        {success ? (
          <Link
            href="/my-classroom"
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            나의 강의실로 이동
          </Link>
        ) : (
          <Link
            href={retryHref}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            다시 시도하기
          </Link>
        )}
      </div>
    </section>
  );
}
