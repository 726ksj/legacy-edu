"use client";

import { useMemo, useState, useTransition } from "react";
import { removeCourseStudent } from "@/app/(main)/mypage/teaching/[courseId]/students/actions";
import { formatDate } from "@/lib/formatDateTime";
import { NO_FILTER, filterStudents, type StudentFilter } from "@/lib/studentFilter";
import StudentFilterBar from "./StudentFilterBar";

export interface RosterStudent {
  enrollmentId: string;
  id: string;
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
  enrolledAt: string;
  // 결제로 등록된 학생은 강사가 직접 해지할 수 없다.
  paid: boolean;
}

function RemoveButton({ student, courseId }: { student: RosterStudent; courseId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          !window.confirm(
            `${student.name} 학생의 수강 권한을 해지할까요? 이 강좌 영상에 남긴 질문도 함께 삭제됩니다.`,
          )
        )
          return;
        startTransition(async () => {
          const result = await removeCourseStudent(student.enrollmentId, courseId);
          if (result.error) window.alert(result.error);
        });
      }}
      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
    >
      {isPending ? "해지 중..." : "수강 해지"}
    </button>
  );
}

// 이 강좌의 수강생 목록. 검색·학교/학년 필터로 좁혀 볼 수 있다.
export default function StudentRoster({
  courseId,
  students,
}: {
  courseId: string;
  students: RosterStudent[];
}) {
  const [filter, setFilter] = useState<StudentFilter>(NO_FILTER);
  const shown = useMemo(() => filterStudents(students, filter), [students, filter]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">수강생 목록</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          이 강좌를 수강 중인 학생 {students.length}명
          {shown.length !== students.length && ` · 검색된 학생 ${shown.length}명`}
        </p>
      </div>

      <StudentFilterBar students={students} filter={filter} onChange={setFilter} />

      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">아이디</th>
              <th className="px-4 py-3">학교 · 학년</th>
              <th className="w-28 px-4 py-3">등록일</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map((student) => (
              <tr key={student.enrollmentId}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <span className="flex items-center gap-2">
                    {student.name}
                    {student.paid && (
                      <span className="rounded bg-brand-light px-1.5 py-0.5 text-[11px] font-semibold text-brand-dark">
                        결제
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{student.username}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {student.school ?? "학교 미정"} · {student.grade ?? "학년 미정"}
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(student.enrolledAt)}</td>
                <td className="px-4 py-3 text-right">
                  {student.paid ? (
                    <span className="text-xs text-zinc-400">결제 학생</span>
                  ) : (
                    <RemoveButton student={student} courseId={courseId} />
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  {students.length === 0
                    ? "등록된 수강생이 없습니다. 위에서 학생을 추가해주세요."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
