"use client";

import { useState } from "react";
import Link from "next/link";
import { removeFromCart } from "./actions";

interface CartCourse {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  school: string | null;
  price: number;
}

export default function CartList({
  items,
}: {
  items: { cartItemId: string; course: CartCourse }[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((item) => item.course.id)),
  );

  function toggle(courseId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-400">
        장바구니가 비어 있습니다.
      </p>
    );
  }

  const selectedItems = items.filter((item) => selected.has(item.course.id));
  const total = selectedItems.reduce(
    (sum, item) => sum + item.course.price,
    0,
  );
  const checkoutHref = `/checkout?courseIds=${selectedItems
    .map((item) => item.course.id)
    .join(",")}`;
  const allSelected = selectedItems.length === items.length;

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(items.map((item) => item.course.id)),
    );
  }

  return (
    <div>
      <label className="flex items-center gap-2 px-1 pb-2 text-sm font-medium text-zinc-600">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 accent-brand"
        />
        전체 선택 ({selectedItems.length}/{items.length})
      </label>

      <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {items.map(({ cartItemId, course }) => (
          <div key={cartItemId} className="flex items-center gap-4 p-4">
            <input
              type="checkbox"
              checked={selected.has(course.id)}
              onChange={() => toggle(course.id)}
              aria-label={`${course.title} 선택`}
              className="h-4 w-4 shrink-0 accent-brand"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500">
                {course.subject} · {course.teacher_name}
                {course.school ? ` · ${course.school}` : ""}
              </p>
              <p className="mt-0.5 font-semibold text-zinc-900">
                {course.title}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold text-zinc-900">
              {course.price.toLocaleString("ko-KR")}원
            </span>
            <form action={removeFromCart.bind(null, cartItemId)}>
              <button
                type="submit"
                className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600"
              >
                삭제
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
        <span className="text-sm font-medium text-zinc-500">
          선택 {selectedItems.length}건 합계
        </span>
        <span className="text-xl font-bold text-zinc-900">
          {total.toLocaleString("ko-KR")}원
        </span>
      </div>

      {selectedItems.length > 0 ? (
        <Link
          href={checkoutHref}
          className="mt-4 block w-full rounded-md bg-brand px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark"
        >
          선택 강좌 결제하기
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-md bg-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-400"
        >
          선택 강좌 결제하기
        </button>
      )}
    </div>
  );
}
