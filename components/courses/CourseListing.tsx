"use client";

import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import { COURSE_CATEGORIES, type CourseListItem } from "./types";

const TABS = ["전체", ...COURSE_CATEGORIES] as const;
type Tab = (typeof TABS)[number];

function groupByCategory(courses: CourseListItem[]) {
  const groups = new Map<string, CourseListItem[]>();
  for (const category of COURSE_CATEGORIES) {
    groups.set(category, []);
  }
  groups.set("기타", []);

  for (const course of courses) {
    const key = course.category ?? "기타";
    groups.get(key)?.push(course);
  }

  return groups;
}

export default function CourseListing({
  courses,
}: {
  courses: CourseListItem[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("전체");
  const grouped = useMemo(() => groupByCategory(courses), [courses]);

  const visibleCourses =
    activeTab === "전체" ? courses : (grouped.get(activeTab) ?? []);

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-zinc-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "border-brand text-brand-dark"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
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

      {activeTab === "전체" ? (
        <div className="mt-6 flex flex-col gap-10">
          {[...COURSE_CATEGORIES, "기타"].map((category) => {
            const list = grouped.get(category) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="mb-2 text-sm font-bold text-zinc-900">
                  [{category}]
                </h2>
                <div>
                  {list.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          {visibleCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
