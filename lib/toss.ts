import "server-only";
import * as Sentry from "@sentry/nextjs";
import { friendlyTossMessage } from "@/lib/tossErrorMessages";

const CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

interface TossConfirmResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  [key: string]: unknown;
}

interface TossErrorResponse {
  code?: string;
  message?: string;
}

// 실패 이유(code)는 Sentry로 그대로 남기되, 사용자에게는 친절한 문구만
// 보여준다. area/context는 Sentry에서 어느 API 호출이었는지 구분하는 용도.
function reportAndThrow(
  area: string,
  data: TossErrorResponse,
  extra: Record<string, unknown>,
): never {
  Sentry.captureException(
    new Error(`Toss ${area} failed: ${data.code ?? "UNKNOWN"} - ${data.message}`),
    { tags: { area: `toss-${area}` }, extra: { ...extra, tossCode: data.code } },
  );
  throw new Error(friendlyTossMessage(data.code));
}

export async function cancelTossPayment({
  paymentKey,
  cancelReason,
}: {
  paymentKey: string;
  cancelReason: string;
}): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY!;
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        // 같은 취소 요청이 네트워크 재시도 등으로 두 번 나가도 토스가
        // 중복 처리하지 않도록 paymentKey 기준으로 키를 고정한다.
        "Idempotency-Key": `cancel:${paymentKey}`,
      },
      body: JSON.stringify({ cancelReason }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    reportAndThrow("cancel", data, { paymentKey });
  }

  return data;
}

// 웹훅 payload는 신뢰하지 않고, 항상 이 함수로 토스에 직접 물어봐서
// 진짜 상태를 확인한다 (토스가 공식적으로 권장하는 검증 방식).
export async function getTossPaymentByOrderId(
  orderId: string,
): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY!;
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/orders/${orderId}`,
    {
      headers: { Authorization: authHeader },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    reportAndThrow("lookup", data, { orderId });
  }

  return data;
}

export async function confirmTossPayment({
  paymentKey,
  orderId,
  amount,
}: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY!;
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

  const res = await fetch(CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      // orderId 기준으로 고정 — 같은 주문에 대한 승인 요청이 두 번
      // 나가도(네트워크 재시도, 동시 페이지 로드 등) 토스가 같은
      // 결과를 돌려주고 중복 승인하지 않는다.
      "Idempotency-Key": `confirm:${orderId}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await res.json();

  if (!res.ok) {
    reportAndThrow("confirm", data, { orderId, paymentKey });
  }

  return data;
}
