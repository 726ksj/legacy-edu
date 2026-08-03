import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Instructor {
  name: string;
  photo_url: string | null;
  bio: string | null;
}

interface Course {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
  overview: string | null;
  thumbnail_url: string | null;
  instructors: Instructor | null;
}

interface Lesson {
  id: string;
  order_no: number;
  title: string;
  section_title: string | null;
  section_subtitle: string | null;
}

interface Section {
  title: string | null;
  subtitle: string | null;
  lessons: Lesson[];
}

export default async function CourseClassroomPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, subject, title, teacher_name, overview, thumbnail_url, instructors(name, photo_url, bio)",
    )
    .eq("id", courseId)
    .maybeSingle()
    .returns<Course>();

  if (!course) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, order_no, title, section_title, section_subtitle")
    .eq("course_id", courseId)
    .eq("status", "ready")
    .order("order_no", { ascending: true })
    .returns<Lesson[]>();

  const sections: Section[] = [];
  for (const lesson of lessons ?? []) {
    const last = sections[sections.length - 1];
    if (last && last.title === lesson.section_title) {
      last.lessons.push(lesson);
    } else {
      sections.push({
        title: lesson.section_title,
        subtitle: lesson.section_subtitle,
        lessons: [lesson],
      });
    }
  }

  const instructor = course.instructors;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-24 sm:px-6">
      <div>
        <Link
          href="/my-classroom"
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← 나의 강의실
        </Link>
        <p className="mt-3 text-xs font-semibold text-brand-dark">
          {course.subject}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">
          {course.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {course.teacher_name} 선생님
        </p>
      </div>

      {(course.thumbnail_url || course.overview) && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:flex-row">
          {course.thumbnail_url && (
            <div className="aspect-video w-full shrink-0 overflow-hidden rounded-md bg-zinc-100 sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          {course.overview && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
              {course.overview}
            </p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-zinc-900">커리큘럼</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {sections.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-zinc-400">
              아직 업로드된 영상이 없습니다.
            </p>
          )}
          <div className="divide-y divide-zinc-100">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title && (
                  <div className="bg-zinc-50 px-6 py-3">
                    <p className="text-sm font-semibold text-zinc-900">
                      {section.title}
                    </p>
                    {section.subtitle && (
                      <p className="text-xs text-zinc-500">
                        {section.subtitle}
                      </p>
                    )}
                  </div>
                )}
                <ul className="divide-y divide-zinc-100">
                  {section.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/watch/${lesson.id}`}
                        className="flex items-center justify-between px-6 py-4 text-sm text-zinc-700 hover:text-brand-dark"
                      >
                        <span>
                          {lesson.order_no}강 · {lesson.title}
                        </span>
                        <span className="text-xs text-zinc-400">
                          시청하기 →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {instructor && (
        <div>
          <h2 className="text-lg font-bold text-zinc-900">강사 소개</h2>
          <div className="mt-3 flex gap-4 rounded-lg border border-zinc-200 bg-white p-6">
            {instructor.photo_url && (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={instructor.photo_url}
                  alt={instructor.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <p className="font-semibold text-zinc-900">{instructor.name}</p>
              {instructor.bio && (
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                  {instructor.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
