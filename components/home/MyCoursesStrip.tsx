import Link from "next/link";

interface CourseItem {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
}

export default function MyCoursesStrip({ courses }: { courses: CourseItem[] }) {
  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-semibold text-zinc-500">
        내가 수강 중인 강좌
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/my-classroom/${course.id}`}
            className="w-56 shrink-0 snap-start rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand"
          >
            <p className="text-xs font-semibold text-brand-dark">
              {course.subject}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-zinc-900">
              {course.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {course.teacher_name} 선생님
            </p>
          </Link>
        ))}
        <Link
          href="/my-classroom"
          className="flex w-28 shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-zinc-300 text-center text-xs font-semibold text-zinc-500 hover:border-brand hover:text-brand-dark"
        >
          전체보기 →
        </Link>
      </div>
    </div>
  );
}
