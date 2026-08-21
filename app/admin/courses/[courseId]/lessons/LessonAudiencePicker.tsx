"use client";

export interface AudienceStudent {
  id: string;
  name: string;
  username: string;
  school: string | null;
  grade: string | null;
}

export default function LessonAudiencePicker({
  students,
  isRestricted,
  onIsRestrictedChange,
  selectedIds,
  onToggleId,
  disabled,
}: {
  students: AudienceStudent[];
  isRestricted: boolean;
  onIsRestrictedChange: (value: boolean) => void;
  selectedIds: Set<string>;
  onToggleId: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-sm font-medium text-zinc-700">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="isRestricted"
            value="false"
            checked={!isRestricted}
            onChange={() => onIsRestrictedChange(false)}
            disabled={disabled}
          />
          전체 공개
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="isRestricted"
            value="true"
            checked={isRestricted}
            onChange={() => onIsRestrictedChange(true)}
            disabled={disabled}
          />
          일부 공개
        </label>
      </div>

      {isRestricted && (
        <div className="max-h-48 min-w-[16rem] overflow-y-auto rounded-md border border-zinc-200">
          {students.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-zinc-400">
              이 강좌에 등록된 학생이 없습니다.
            </p>
          )}
          {students.map((student) => (
            <label
              key={student.id}
              className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-3 py-2 text-xs last:border-b-0 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="profileIds"
                value={student.id}
                checked={selectedIds.has(student.id)}
                onChange={() => onToggleId(student.id)}
                disabled={disabled}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="text-zinc-400">
                {student.school ?? "학교 미정"} · {student.grade ?? "학년 미정"}
              </span>
              <span className="text-zinc-700">{student.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
