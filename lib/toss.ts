import "server-only";

const CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

interface TossConfirmResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  [key: string]: unknown;
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
      },
      body: JSON.stringify({ cancelReason }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "결제 취소에 실패했습니다.");
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
    throw new Error(data.message ?? "결제 조회에 실패했습니다.");
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
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "결제 승인에 실패했습니다.");
  }

  return data;
}
