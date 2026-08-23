"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonVisibility } from "@/lib/enrollments";

export interface AudienceStudent {
  id: string;
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
}

const VISIBILITY_OPTIONS: { value: LessonVisibility; label: string }[] = [
  { value: "all", label: "전체 공개" },
  { value: "include", label: "일부 공개" },
  { value: "exclude", label: "일부 비공개" },
];

export default function LessonAudiencePicker({
  students,
  visibility,
  onVisibilityChange,
  selectedIds,
  onToggleId,
  disabled,
}: {
  students: AudienceStudent[];
  visibility: LessonVisibility;
  onVisibilityChange: (value: LessonVisibility) => void;
  selectedIds: Set<string>;
  onToggleId: (id: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const triggerLabel =
    selectedIds.size === 0
      ? "학생 선택"
      : visibility === "exclude"
        ? `${selectedIds.size}명 제외됨`
        : `${selectedIds.size}명 선택됨`;

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 p-0.5">
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={visibility === option.value}
              onChange={() => {
                onVisibilityChange(option.value);
                setIsOpen(option.value !== "all");
              }}
              disabled={disabled}
              className="peer sr-only"
            />
            <span className="block rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-zinc-500 transition-colors peer-checked:bg-white peer-checked:text-brand-dark peer-checked:shadow-sm">
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {visibility !== "all" && (
        <div ref={containerRef} className="relative w-56">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            disabled={disabled}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand disabled:opacity-60"
          >
            <span>{triggerLabel}</span>
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* FormData가 항상 최신 선택값을 담도록, 드롭다운이 닫혀 있어도
              체크박스 자체는 DOM에서 없애지 않고 hidden 클래스로만 숨긴다. */}
          <div
            className={`absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg ${
              isOpen ? "" : "hidden"
            }`}
          >
            <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
              {visibility === "exclude"
                ? "체크한 학생은 볼 수 없습니다"
                : "체크한 학생만 볼 수 있습니다"}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {students.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-zinc-400">
                  이 강좌에 등록된 학생이 없습니다.
                </p>
              ) : (
                students.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-zinc-50 px-3 py-2 text-xs transition-colors last:border-b-0 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      name="profileIds"
                      value={student.id}
                      checked={selectedIds.has(student.id)}
                      onChange={() => onToggleId(student.id)}
                      disabled={disabled}
                      className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300 accent-brand"
                    />
                    <span className="truncate text-zinc-400">
                      {student.school ?? "학교 미정"} ·{" "}
                      {student.grade ?? "학년 미정"}
                    </span>
                    <span className="shrink-0 font-medium text-zinc-800">
                      {student.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
