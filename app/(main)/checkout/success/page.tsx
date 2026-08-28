import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmTossPayment } from "@/lib/toss";
import { fulfillPaidOrder } from "@/lib/orderFulfillment";

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

    // 여기까지 왔으면 돈은 이미 승인됐다. 이 시점 이후로는 무슨 일이
    // 있어도 주문을 다시 failed로 되돌리면 안 된다 — 결제가 실패했다는
    // 뜻이 아니라 뒷정리(수강 등록 등)가 실패했다는 뜻이라, 사용자에게
    // "실패"로 보여주면 돈은 냈는데 재시도해서 이중결제를 유도하게 된다.
    // fulfillPaidOrder는 pending일 때만 갱신하는 조건부 UPDATE라 웹훅과
    // 동시에 들어와도 한 번만 반영된다.
    await fulfillPaidOrder({
      orderDbId: order.id,
      profileId: order.profile_id,
      paymentKey: result.paymentKey,
    });

    outcome = {
      title: "결제가 완료되었습니다",
      description: "이제 나의 강의실에서 바로 수강을 시작할 수 있어요.",
      success: true,
    };
  } catch (err) {
    // Toss 승인 자체가 거절된 경우만 여기로 온다 (돈이 안 나감).
    // pending일 때만 failed로 바꾼다 — 동시 요청 중 다른 하나가 먼저
    // 승인에 성공해 이미 paid로 바뀌어 있을 수 있어서다.
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("status", "pending");

    const { data: latestOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .maybeSingle();

    if (latestOrder?.status === "paid") {
      outcome = {
        title: "결제가 완료되었습니다",
        description: "이제 나의 강의실에서 바로 수강을 시작할 수 있어요.",
        success: true,
      };
    } else {
      outcome = {
        title: "결제 승인에 실패했습니다",
        description:
          err instanceof Error ? err.message : "잠시 후 다시 시도해주세요.",
      };
    }
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
