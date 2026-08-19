"use client";

import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import type { CourseListItem } from "./types";

const UNASSIGNED = "기타";

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

  const visibleCourses =
    activeTab === "전체" ? courses : (grouped.get(activeTab) ?? []);

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-zinc-200">
        {tabs.map((tab) => (
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
          {schoolTabs.map((school) => {
            const list = grouped.get(school) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={school}>
                <h2 className="mb-2 text-sm font-bold text-zinc-900">
                  [{school}]
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
