"use client";

import { UNSET, distinctOptions, type FilterableStudent, type StudentFilter } from "@/lib/studentFilter";

// 학교/학년 드롭다운은 선택지 길이와 상관없이 같은 너비로 맞춘다.
const SELECT_CLASS =
  "w-40 rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-brand";

// 검색창 + 학교/학년 드롭다운. 수강생 추가와 수강생 목록이 같이 쓴다.
export default function StudentFilterBar({
  students,
  filter,
  onChange,
  placeholder = "이름·아이디·학교·학년으로 검색",
}: {
  students: FilterableStudent[];
  filter: StudentFilter;
  onChange: (next: StudentFilter) => void;
  placeholder?: string;
}) {
  const schools = distinctOptions(students.map((student) => student.school));
  const grades = distinctOptions(students.map((student) => student.grade));
  const hasUnsetSchool = students.some((student) => !student.school);
  const hasUnsetGrade = students.some((student) => !student.grade);
  const active = Boolean(filter.query || filter.school || filter.grade);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="text"
        value={filter.query}
        onChange={(e) => onChange({ ...filter, query: e.target.value })}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter.school}
          onChange={(e) => onChange({ ...filter, school: e.target.value })}
          className={SELECT_CLASS}
          aria-label="학교"
        >
          <option value="">학교 전체</option>
          {schools.map((school) => (
            <option key={school} value={school}>
              {school}
            </option>
          ))}
          {hasUnsetSchool && <option value={UNSET}>학교 미정</option>}
        </select>
        <select
          value={filter.grade}
          onChange={(e) => onChange({ ...filter, grade: e.target.value })}
          className={SELECT_CLASS}
          aria-label="학년"
        >
          <option value="">학년 전체</option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
          {hasUnsetGrade && <option value={UNSET}>학년 미정</option>}
        </select>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ query: "", school: "", grade: "" })}
            className="text-xs font-semibold text-zinc-500 hover:text-brand-dark hover:underline"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
