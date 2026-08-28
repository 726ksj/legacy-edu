"use client";

import { useMemo, useState } from "react";

export interface StudentDetailRow {
  id: string;
  studentName: string;
  grade: string;
  categoryLabel: string;
  score: string;
  examDate: string | null;
}

type SortKey = "studentName" | "grade" | "categoryLabel" | "score" | "examDate";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "studentName", label: "이름" },
  { key: "grade", label: "학년" },
  { key: "categoryLabel", label: "카테고리" },
  { key: "score", label: "점수" },
  { key: "examDate", label: "시험일" },
];

export default function StudentDetailsTable({
  rows,
}: {
  rows: StudentDetailRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("examDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = String(a[sortKey] ?? "").localeCompare(
        String(b[sortKey] ?? ""),
        "ko",
      );
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-zinc-50 text-xs font-semibold text-zinc-500">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 hover:text-brand-dark"
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2 text-zinc-700">{row.studentName}</td>
              <td className="px-4 py-2 text-zinc-500">{row.grade}</td>
              <td className="px-4 py-2 text-zinc-500">{row.categoryLabel}</td>
              <td className="px-4 py-2 font-semibold text-brand-dark">
                {row.score}
              </td>
              <td className="px-4 py-2 text-zinc-500">{row.examDate ?? "-"}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-8 text-center text-zinc-400"
              >
                등록된 성적이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
