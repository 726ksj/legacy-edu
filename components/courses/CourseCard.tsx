import Link from "next/link";
import type { CourseListItem } from "./types";

function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export default function CourseCard({ course }: { course: CourseListItem }) {
  return (
    <div className="border-b border-zinc-200 py-6 first:pt-0 last:border-b-0">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex shrink-0 flex-row gap-1 text-sm text-zinc-500 sm:w-24 sm:flex-col sm:gap-0.5">
          <span>{course.subject}</span>
          <span className="font-semibold text-zinc-700">
            {course.teacherName}
          </span>
          {course.category && <span>{course.category}</span>}
        </div>

        <div className="min-w-0 flex-1">
          {course.isBest && (
            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
              BEST
            </span>
          )}
          {course.tagline && (
            <p className="mt-1 text-sm font-bold text-zinc-800">
              {course.tagline}
            </p>
          )}
          <Link
            href={`/courses/${course.id}`}
            className="mt-0.5 block text-base font-semibold text-zinc-900 hover:text-brand-dark hover:underline"
          >
            {course.title}
          </Link>
          <p className="mt-2 text-xs text-zinc-400">
            {course.durationDays != null && (
              <>수강기간: {course.durationDays}일</>
            )}
            {course.durationDays != null && "    "}
            강의수: {course.lectureCount}강
          </p>
        </div>

        <div className="flex shrink-0 flex-row items-start gap-4 sm:w-56 sm:flex-col sm:items-end sm:gap-2">
          <Link
            href={`/courses/${course.id}`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:border-brand hover:text-brand-dark"
          >
            맛보기
          </Link>
          <div className="flex flex-col gap-1.5 text-sm text-zinc-700">
            <label className="flex items-center justify-end gap-2">
              <span>PC</span>
              <span className="w-20 text-right font-semibold text-zinc-900">
                {formatWon(course.price)}
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-brand"
              />
            </label>
            {course.materialPrice != null && (
              <label className="flex items-center justify-end gap-2">
                <span>교재</span>
                <span className="w-20 text-right font-semibold text-zinc-900">
                  {formatWon(course.materialPrice)}
                </span>
                <input type="checkbox" className="h-4 w-4 accent-brand" />
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Link
          href="/mypage/cart"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:border-brand hover:text-brand-dark"
        >
          장바구니
        </Link>
        <Link
          href={`/courses/${course.id}`}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          즉시구매
        </Link>
      </div>
    </div>
  );
}
