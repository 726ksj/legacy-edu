import "server-only";

const CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

interface TossConfirmResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  [key: string]: unknown;
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
