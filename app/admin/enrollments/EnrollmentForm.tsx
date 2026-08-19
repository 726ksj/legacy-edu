"use client";

import { useActionState, useRef, useEffect, useState, useMemo } from "react";
import { createEnrollment, type CreateEnrollmentState } from "./actions";

const initialState: CreateEnrollmentState = {};

interface Course {
  id: string;
  subject: string;
  title: string;
}

interface Student {
  id: string;
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
}

export default function EnrollmentForm({
  courses,
  students,
}: {
  courses: Course[];
  students: Student[];
}) {
  const [state, formAction, isPending] = useActionState(
    createEnrollment,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setSelected(new Set());
      setQuery("");
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const filteredStudents = useMemo(() => {
    const q = query.trim();
    if (!q) return students;
    return students.filter(
      (student) =>
        student.name.includes(q) ||
        student.username.includes(q) ||
        student.school?.includes(q),
    );
  }, [students, query]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selected.has(student.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const student of filteredStudents) {
        if (allFilteredSelected) {
          next.delete(student.id);
        } else {
          next.add(student.id);
        }
      }
      return next;
    });
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          강좌
          <select
            name="courseId"
            required
            defaultValue=""
            className="min-w-[16rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value="" disabled>
              선택
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                [{course.subject}] {course.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isPending || selected.size === 0}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "등록 중..." : `수강 등록 (${selected.size}명)`}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">학생</span>
          <button
            type="button"
            onClick={toggleAllFiltered}
            className="text-xs font-medium text-brand-dark hover:underline"
          >
            {allFilteredSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 아이디로 검색"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-200">
          {filteredStudents.map((student) => (
            <label
              key={student.id}
              className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="profileIds"
                value={student.id}
                checked={selected.has(student.id)}
                onChange={() => toggle(student.id)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="text-xs text-zinc-400">
                {student.school ?? "학교 미정"} · {student.grade ?? "학년 미정"}
              </span>
              <span className="text-zinc-700">{student.name}</span>
            </label>
          ))}
          {filteredStudents.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-zinc-400">
              검색 결과가 없습니다.
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && state.message && (
        <p className="text-sm font-medium text-brand-dark">{state.message}</p>
      )}
    </form>
  );
}
