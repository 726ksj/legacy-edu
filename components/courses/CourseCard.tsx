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
    <div
      className={`flex flex-col gap-5 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center sm:gap-6 ${
        checked
          ? "border-brand bg-brand-light/40"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex shrink-0 flex-col items-center gap-1.5 sm:w-28">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark">
          {course.subject}
        </span>
        <span className="text-sm font-semibold text-zinc-700">
          {course.teacherName}
        </span>
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

      <div className="flex shrink-0 flex-row items-center gap-3 sm:w-40 sm:justify-end">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${course.title} 선택`}
          className="h-5 w-5 shrink-0 accent-brand"
        />
        <span className="w-28 shrink-0 whitespace-nowrap text-right text-lg font-bold text-zinc-900">
          {formatWon(course.price)}
        </span>
      </div>
    </div>
  );
}
