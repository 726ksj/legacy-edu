"use client";

import { useActionState, useMemo, useState } from "react";
import {
  addCourseStudents,
  type AddStudentsState,
} from "@/app/(main)/mypage/teaching/[courseId]/students/actions";
import { NO_FILTER, filterStudents, type StudentFilter } from "@/lib/studentFilter";
import StudentFilterBar from "./StudentFilterBar";

export interface CandidateStudent {
  id: string;
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
}

const initialState: AddStudentsState = {};

// 이 강좌에 아직 등록되지 않은 학생 중에서 골라 한 번에 추가한다. 학생이 많아도
// 검색·학교/학년 필터로 좁힌 뒤 "검색된 학생 전체 선택"으로 한꺼번에 고를 수 있다.
export default function AddStudentsPanel({
  courseId,
  candidates,
}: {
  courseId: string;
  candidates: CandidateStudent[];
}) {
  const [state, formAction, isPending] = useActionState(
    addCourseStudents.bind(null, courseId),
    initialState,
  );
  const [filter, setFilter] = useState<StudentFilter>(NO_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prevState, setPrevState] = useState(state);

  // 등록이 끝나면 선택과 검색을 비운다(방금 등록한 학생은 목록에서 빠진다).
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setSelected(new Set());
      setFilter(NO_FILTER);
    }
  }

  const shown = useMemo(() => filterStudents(candidates, filter), [candidates, filter]);
  const allShownSelected = shown.length > 0 && shown.every((student) => selected.has(student.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const student of shown) {
        if (allShownSelected) next.delete(student.id);
        else next.add(student.id);
      }
      return next;
    });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">수강생 추가</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            아직 이 강좌에 등록되지 않은 학생 {candidates.length}명 중에서 고릅니다.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending || selected.size === 0}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "등록 중..." : `${selected.size}명 추가`}
        </button>
      </div>

      <StudentFilterBar students={candidates} filter={filter} onChange={setFilter} />

      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">
          검색된 학생 {shown.length}명 · 선택 {selected.size}명
        </span>
        <button
          type="button"
          onClick={toggleAllShown}
          disabled={shown.length === 0}
          className="font-medium text-brand-dark hover:underline disabled:opacity-40"
        >
          {allShownSelected ? "검색된 학생 전체 해제" : "검색된 학생 전체 선택"}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200">
        {shown.map((student) => (
          <label
            key={student.id}
            className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={selected.has(student.id)}
              onChange={() => toggle(student.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="font-medium text-zinc-800">{student.name}</span>
            <span className="text-xs text-zinc-400">{student.username}</span>
            <span className="ml-auto text-xs text-zinc-400">
              {student.school ?? "학교 미정"} · {student.grade ?? "학년 미정"}
            </span>
          </label>
        ))}
        {shown.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-zinc-400">
            {candidates.length === 0
              ? "추가할 수 있는 학생이 없습니다."
              : "검색 결과가 없습니다."}
          </p>
        )}
      </div>

      {/* 선택은 화면에서 필터를 바꿔도 유지되도록 hidden input으로 한꺼번에 보낸다. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="profileIds" value={id} />
      ))}

      {state.error && <p className="text-sm font-medium text-red-500">{state.error}</p>}
      {state.success && state.message && (
        <p className="text-sm font-medium text-brand-dark">{state.message}</p>
      )}
    </form>
  );
}
