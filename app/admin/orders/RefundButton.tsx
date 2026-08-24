"use client";

import { useActionState } from "react";
import { refundOrder, type RefundState } from "./actions";

const initialState: RefundState = {};

export default function RefundButton({ orderId }: { orderId: string }) {
  const boundAction = refundOrder.bind(null, orderId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "이 주문을 환불할까요? 토스 결제가 취소되고 수강 등록도 함께 취소됩니다.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
      >
        {isPending ? "환불 처리 중..." : "환불"}
      </button>
      {state.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
    </form>
  );
}
