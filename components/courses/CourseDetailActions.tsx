"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addManyToCart } from "@/app/(main)/mypage/cart/actions";

export default function CourseDetailActions({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  async function handleAddToCart() {
    setIsAddingToCart(true);
    setCartError(null);
    const result = await addManyToCart([courseId]);
    if (result?.error) {
      setCartError(result.error);
    }
    setIsAddingToCart(false);
  }

  function handleBuyNow() {
    router.push(`/checkout?courseIds=${courseId}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="rounded-lg border-2 border-zinc-300 bg-white px-4 py-3 text-base font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-50"
        >
          {isAddingToCart ? "담는 중..." : "장바구니 담기"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="rounded-lg bg-brand px-4 py-3 text-base font-bold text-white transition-colors hover:bg-brand-dark"
        >
          바로 구매하기
        </button>
      </div>
      {cartError && (
        <p className="text-sm font-medium text-red-500">{cartError}</p>
      )}
    </div>
  );
}
