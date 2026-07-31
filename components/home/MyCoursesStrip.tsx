import Link from "next/link";

interface CourseItem {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
}

export default function MyCoursesStrip({ courses }: { courses: CourseItem[] }) {
  return (
    <div className="mt-8 w-full">
      <p className="mb-2 text-xs font-semibold text-zinc-500 lg:text-sm">
        내가 수강 중인 강좌
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:gap-4">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/my-classroom/${course.id}`}
            className="w-56 shrink-0 snap-start rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand lg:w-[21rem] lg:p-6"
          >
            <p className="text-xs font-semibold text-brand-dark lg:text-sm">
              {course.subject}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-zinc-900 lg:text-lg">
              {course.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500 lg:text-sm">
              {course.teacher_name} 선생님
            </p>
          </Link>
        ))}
        <Link
          href="/my-classroom"
          className="flex w-28 shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-zinc-300 text-center text-xs font-semibold text-zinc-500 hover:border-brand hover:text-brand-dark lg:w-[10.5rem] lg:text-sm"
        >
          전체보기 →
        </Link>
      </div>
    </div>
  );
}
