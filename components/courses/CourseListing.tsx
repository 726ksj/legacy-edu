"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CourseCard from "./CourseCard";
import { addManyToCart } from "@/app/(main)/mypage/cart/actions";
import type { CourseListItem } from "./types";

const UNASSIGNED = "기타";
const PAGE_SIZE = 10;

function groupBySchool(courses: CourseListItem[]) {
  const groups = new Map<string, CourseListItem[]>();
  for (const course of courses) {
    const key = course.school ?? UNASSIGNED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(course);
  }
  return groups;
}

export default function CourseListing({
  courses,
}: {
  courses: CourseListItem[];
}) {
  const router = useRouter();
  const grouped = useMemo(() => groupBySchool(courses), [courses]);

  // 학교명은 자유 입력이라 정해진 목록이 없으니, 실제로 강좌가 있는
  // 학교만 가나다순으로 탭에 올리고 미배정 강좌는 맨 뒤 "기타"로 둔다.
  const schoolTabs = useMemo(() => {
    const schools = [...grouped.keys()]
      .filter((key) => key !== UNASSIGNED)
      .sort((a, b) => a.localeCompare(b, "ko"));
    if (grouped.get(UNASSIGNED)?.length) schools.push(UNASSIGNED);
    return schools;
  }, [grouped]);

  const tabs = ["전체", ...schoolTabs];
  const [activeTab, setActiveTab] = useState<string>("전체");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  function selectTab(tab: string) {
    setActiveTab(tab);
    setPage(1);
  }

  const visibleCourses =
    activeTab === "전체" ? courses : (grouped.get(activeTab) ?? []);
  const totalPages = Math.max(1, Math.ceil(visibleCourses.length / PAGE_SIZE));
  const pagedCourses = visibleCourses.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
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

  const selectedCourses = courses.filter((course) => selected.has(course.id));
  const total = selectedCourses.reduce((sum, course) => sum + course.price, 0);

  async function handleAddToCart() {
    if (selected.size === 0) return;
    setIsAddingToCart(true);
    setCartError(null);
    const result = await addManyToCart([...selected]);
    if (result?.error) {
      setCartError(result.error);
    }
    setIsAddingToCart(false);
  }

  function handleBuyNow() {
    if (selected.size === 0) return;
    router.push(`/checkout?courseIds=${[...selected].join(",")}`);
  }

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => selectTab(tab)}
            className={`min-w-[84px] shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-center text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {visibleCourses.length === 0 && (
        <p className="py-16 text-center text-sm text-zinc-400">
          아직 개설된 강좌가 없습니다.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pagedCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            checked={selected.has(course.id)}
            onToggle={() => toggle(course.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={page === n ? "page" : undefined}
              className={`h-8 min-w-8 rounded-md px-2 text-sm font-semibold transition-colors ${
                page === n
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {visibleCourses.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border-2 border-brand/25 bg-brand-light/40 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-base font-bold text-zinc-800 sm:text-lg">
                선택 {selected.size}개 · 합계{" "}
                <span className="text-brand-dark">
                  {total.toLocaleString("ko-KR")}원
                </span>
              </span>
              <Link
                href="/mypage/cart"
                className="w-fit text-sm font-semibold text-brand-dark hover:underline"
              >
                내 장바구니 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:w-96">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={selected.size === 0 || isAddingToCart}
                className="rounded-lg border-2 border-zinc-300 bg-white px-4 py-3 text-base font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-50"
              >
                {isAddingToCart ? "담는 중..." : "장바구니 담기"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={selected.size === 0}
                className="rounded-lg bg-brand px-4 py-3 text-base font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                선택 강좌 구매하기
              </button>
            </div>
          </div>
          {cartError && (
            <p className="text-sm font-medium text-red-500">{cartError}</p>
          )}
        </div>
      )}
    </div>
  );
}
