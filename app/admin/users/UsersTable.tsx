"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface UserRow {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
}

const ALL = "__all__";

export default function UsersTable({ users }: { users: UserRow[] }) {
  const [school, setSchool] = useState(ALL);
  const [grade, setGrade] = useState(ALL);

  const schoolOptions = useMemo(
    () =>
      Array.from(new Set(users.map((u) => u.school).filter(Boolean))).sort(
        (a, b) => a!.localeCompare(b!),
      ) as string[],
    [users],
  );
  const gradeOptions = useMemo(
    () =>
      Array.from(new Set(users.map((u) => u.grade).filter(Boolean))).sort(
        (a, b) => a!.localeCompare(b!),
      ) as string[],
    [users],
  );

  const filtered = users.filter(
    (u) =>
      (school === ALL || u.school === school) &&
      (grade === ALL || u.grade === grade),
  );

  const isFiltering = school !== ALL || grade !== ALL;

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          학교
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value={ALL}>전체</option>
            {schoolOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          학년
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
          >
            <option value={ALL}>전체</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        {isFiltering && (
          <button
            type="button"
            onClick={() => {
              setSchool(ALL);
              setGrade(ALL);
            }}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
          >
            필터 초기화
          </button>
        )}
        <span className="text-xs text-zinc-400">
          {filtered.length}명 / 전체 {users.length}명
        </span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">학년</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.name}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.school ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">{row.grade ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    자세히 보기
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  {users.length === 0
                    ? "가입한 회원이 없습니다."
                    : "조건에 맞는 회원이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
