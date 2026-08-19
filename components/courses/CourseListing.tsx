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
      <div className="flex justify-center overflow-x-auto">
        <div className="inline-flex divide-x divide-zinc-300 overflow-hidden rounded-md border border-zinc-300">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-6 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {visibleCourses.length === 0 && (
        <p className="py-16 text-center text-sm text-zinc-400">
          아직 개설된 강좌가 없습니다.
        </p>
      )}

      <div className="mt-8">
        {visibleCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
