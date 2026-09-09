import Link from "next/link";

interface CourseItem {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
}

// 강사는 영상/공지를 직접 관리하니 "강의하고 있는 강좌"로, 조교는 성적
// 관리만 담당하니 "담당하고 있는 강좌"로 - 각 역할이 실제로 갈 수 있는
// 페이지(강사: 강좌 관리, 조교: 성적 관리)로 카드를 연결한다.
export default function MyTeachingCoursesStrip({
  role,
  courses,
}: {
  role: "teacher" | "assistant";
  courses: CourseItem[];
}) {
  const label = role === "teacher" ? "강의하고 있는 강좌" : "담당하고 있는 강좌";
  const courseHref = (courseId: string) =>
    role === "teacher"
      ? `/mypage/teaching/${courseId}`
      : `/mypage/grading/${courseId}`;
  const viewAllHref = role === "teacher" ? "/mypage/teaching" : "/mypage/grading";

  return (
    <div className="mt-8 w-full">
      <p className="mb-2 text-xs font-semibold text-zinc-500 lg:text-sm">
        {label}
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:gap-4">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={courseHref(course.id)}
            className="w-56 shrink-0 snap-start rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand lg:w-[21rem] lg:p-6"
          >
            <p className="text-xs font-semibold text-brand-dark lg:text-sm">
              {course.subject}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-zinc-900 lg:text-lg">
              {course.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500 lg:text-sm">
              {course.teacher_name} 강사
            </p>
          </Link>
        ))}
        <Link
          href={viewAllHref}
          className="flex w-28 shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-zinc-300 text-center text-xs font-semibold text-zinc-500 hover:border-brand hover:text-brand-dark lg:w-[10.5rem] lg:text-sm"
        >
          전체보기 →
        </Link>
      </div>
    </div>
  );
}
