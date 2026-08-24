"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DeleteCourseButton from "./DeleteCourseButton";
import { deleteCourse } from "./actions";

export interface CourseRow {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
  school: string | null;
  level: string | null;
  price: number;
  created_at: string;
}

function uniqueSorted(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort(
    (a, b) => a.localeCompare(b, "ko"),
  );
}

export default function CourseTable({
  courses,
  editingCourseId,
}: {
  courses: CourseRow[];
  editingCourseId?: string | null;
}) {
  const [subjectFilter, setSubjectFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");

  const subjects = useMemo(
    () => uniqueSorted(courses.map((c) => c.subject)),
    [courses],
  );
  const teachers = useMemo(
    () => uniqueSorted(courses.map((c) => c.teacher_name)),
    [courses],
  );
  const schools = useMemo(
    () => uniqueSorted(courses.map((c) => c.school)),
    [courses],
  );

  const filtered = courses.filter((row) => {
    if (subjectFilter && row.subject !== subjectFilter) return false;
    if (teacherFilter && row.teacher_name !== teacherFilter) return false;
    if (schoolFilter && (row.school ?? "") !== schoolFilter) return false;
    if (
      titleFilter &&
      !row.title.toLowerCase().includes(titleFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const hasActiveFilter = Boolean(
    subjectFilter || titleFilter || teacherFilter || schoolFilter,
  );

  function resetFilters() {
    setSubjectFilter("");
    setTitleFilter("");
    setTeacherFilter("");
    setSchoolFilter("");
  }

  return (
    <div>
      <p className="mb-1 text-right text-xs text-zinc-400">
        {filtered.length} / {courses.length}개
      </p>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">강좌명</th>
              <th className="px-4 py-3">선생님</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">과정</th>
              <th className="px-4 py-3">가격</th>
              <th className="px-4 py-3">개설일</th>
              <th className="px-4 py-3" />
            </tr>
            <tr className="border-t border-zinc-100">
              <th className="px-4 pb-3">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs font-normal text-zinc-700 outline-none focus:border-brand"
                >
                  <option value="">전체</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-4 pb-3">
                <input
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                  placeholder="검색"
                  className="w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs font-normal text-zinc-700 outline-none focus:border-brand"
                />
              </th>
              <th className="px-4 pb-3">
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs font-normal text-zinc-700 outline-none focus:border-brand"
                >
                  <option value="">전체</option>
                  {teachers.map((teacher) => (
                    <option key={teacher} value={teacher}>
                      {teacher}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-4 pb-3">
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs font-normal text-zinc-700 outline-none focus:border-brand"
                >
                  <option value="">전체</option>
                  {schools.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-4 pb-3" />
              <th className="px-4 pb-3" />
              <th className="px-4 pb-3" />
              <th className="px-4 pb-3 text-right">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600"
                  >
                    초기화
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={row.id === editingCourseId ? "bg-amber-50" : undefined}
              >
                <td className="px-4 py-3 text-zinc-700">{row.subject}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <Link
                    href={`/admin/courses/${row.id}`}
                    className="hover:text-brand-dark hover:underline"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {row.teacher_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.school ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.level === "high"
                    ? "고등"
                    : row.level === "middle"
                      ? "중등"
                      : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.price ? `${row.price.toLocaleString()}원` : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/courses/${row.id}/lessons`}
                      className="text-xs font-semibold text-brand-dark hover:underline"
                    >
                      차시 관리
                    </Link>
                    <Link
                      href={`/admin/courses?edit=${row.id}`}
                      className="text-xs font-semibold text-zinc-600 hover:underline"
                    >
                      수정
                    </Link>
                    <DeleteCourseButton
                      action={deleteCourse.bind(null, row.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                  {courses.length === 0
                    ? "등록된 강좌가 없습니다."
                    : "조건에 맞는 강좌가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
