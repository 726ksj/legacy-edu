"use client";

import { useActionState, useState } from "react";
import { updateLessonInfo, type UpdateLessonInfoState } from "./actions";
import DeleteLessonButton from "./DeleteLessonButton";
import LessonAudiencePicker, {
  type AudienceStudent,
} from "./LessonAudiencePicker";

const initialState: UpdateLessonInfoState = {};

interface StatusInfo {
  label: string;
  className: string;
}

interface Lesson {
  id: string;
  order_no: number;
  title: string;
  status: string;
  description: string | null;
  created_at: string;
  is_restricted: boolean;
}

export default function LessonRow({
  lesson,
  courseId,
  statusInfo,
  students,
  initialSelectedIds,
  deleteAction,
}: {
  lesson: Lesson;
  courseId: string;
  statusInfo: StatusInfo;
  students: AudienceStudent[];
  initialSelectedIds: string[];
  deleteAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [isRestricted, setIsRestricted] = useState(lesson.is_restricted);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds),
  );
  const boundUpdate = updateLessonInfo.bind(null, lesson.id, courseId);
  const [state, formAction, isPending] = useActionState(
    boundUpdate,
    initialState,
  );

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <form
            action={formAction}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              차시 번호
              <input
                name="orderNo"
                type="number"
                defaultValue={lesson.order_no}
                required
                className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              제목
              <input
                name="title"
                defaultValue={lesson.title}
                required
                className="min-w-[12rem] rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              차시 소개
              <input
                name="description"
                defaultValue={lesson.description ?? ""}
                className="min-w-[16rem] rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
              공개 대상
              <LessonAudiencePicker
                students={students}
                isRestricted={isRestricted}
                onIsRestrictedChange={setIsRestricted}
                selectedIds={selectedIds}
                onToggleId={toggleId}
                disabled={isPending}
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
            >
              취소
            </button>
            {state.error && (
              <p className="w-full text-xs font-medium text-red-500">
                {state.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3 text-zinc-700">{lesson.order_no}</td>
      <td className="px-4 py-3 font-medium text-zinc-900">
        {lesson.title}
        {lesson.description && (
          <p className="mt-0.5 max-w-xs truncate text-xs font-normal text-zinc-400">
            {lesson.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
          {lesson.is_restricted && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              일부 공개 ({selectedIds.size}명)
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-zinc-500">
        {new Date(lesson.created_at).toLocaleString("ko-KR")}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand-dark hover:underline"
          >
            수정
          </button>
          <DeleteLessonButton action={deleteAction} />
        </div>
      </td>
    </tr>
  );
}
