import Link from "next/link";
import type { CourseListItem } from "./types";

function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export default function CourseCard({
  course,
  checked,
  onToggle,
}: {
  course: CourseListItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-zinc-200 py-6 first:pt-0 last:border-b-0">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex shrink-0 flex-row gap-1 text-sm text-zinc-500 sm:w-24 sm:flex-col sm:gap-0.5">
          <span>{course.subject}</span>
          <span className="font-semibold text-zinc-700">
            {course.teacherName}
          </span>
          {course.school && <span>{course.school}</span>}
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
            className="mt-0.5 block text-lg font-semibold text-zinc-900 hover:text-brand-dark hover:underline"
          >
            {course.title}
          </Link>
          <p className="mt-2 text-xs text-zinc-400">
            {course.durationDays != null && (
              <>수강기간: {Math.round(course.durationDays / 7)}주, </>
            )}
            강의수: {course.lectureCount}강
          </p>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2 sm:w-40 sm:justify-end">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={`${course.title} 선택`}
            className="h-4 w-4 shrink-0 accent-brand"
          />
          <span className="w-28 shrink-0 whitespace-nowrap text-right text-lg font-bold text-zinc-900">
            {formatWon(course.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
