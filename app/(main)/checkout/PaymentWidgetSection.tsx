"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadPaymentWidget,
  ANONYMOUS,
  type PaymentWidgetInstance,
} from "@tosspayments/payment-widget-sdk";
import { createPendingOrder } from "./actions";

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

export default function PaymentWidgetSection({
  courseIds,
  amount,
}: {
  courseIds: string[];
  amount: number;
}) {
  const widgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPaymentWidget(CLIENT_KEY, ANONYMOUS)
      .then((widget) => {
        if (cancelled) return;
        widgetRef.current = widget;
        widget.renderPaymentMethods("#payment-widget", amount);
        widget.renderAgreement("#payment-agreement");
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "결제 위젯을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [amount]);

  async function handlePay() {
    if (!widgetRef.current) return;
    setIsPaying(true);
    setError(null);

    try {
      const order = await createPendingOrder(courseIds);
      const origin = window.location.origin;
      await widgetRef.current.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${origin}/checkout/success`,
        failUrl: `${origin}/checkout/fail`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "결제 요청 중 오류가 발생했습니다.",
      );
      setIsPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div id="payment-widget" />
      <div id="payment-agreement" />

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || isPaying}
        className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPaying ? "결제 요청 중..." : "결제하기"}
      </button>
    </div>
  );
}
