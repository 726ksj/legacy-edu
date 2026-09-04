"use client";

import Image from "next/image";
import { useActionState } from "react";
import { updateInstructor, type InstructorFormState } from "../actions";
import { SUBJECTS } from "@/lib/subjects";

const initialState: InstructorFormState = {};

interface InstructorData {
  id: string;
  name: string;
  subject: string;
  photo_url: string | null;
  bio: string | null;
  profile_id: string | null;
}

interface TeacherAccount {
  id: string;
  name: string;
  username: string;
}

export default function EditInstructorForm({
  instructor,
  teachers,
}: {
  instructor: InstructorData;
  teachers: TeacherAccount[];
}) {
  const boundUpdateInstructor = updateInstructor.bind(null, instructor.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdateInstructor,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        강사 이름
        <input
          name="name"
          defaultValue={instructor.name}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        과목
        <select
          name="subject"
          required
          defaultValue={instructor.subject}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
        사진
        <div className="flex items-center gap-3">
          {instructor.photo_url && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-100">
              <Image
                src={instructor.photo_url}
                alt={instructor.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          )}
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:border-brand hover:file:text-brand-dark"
          />
        </div>
        <span className="text-xs text-zinc-400">
          새 사진을 선택하면 기존 사진을 대체합니다.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
        소개
        <textarea
          name="bio"
          defaultValue={instructor.bio ?? ""}
          rows={4}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
        연결된 선생님 계정 (선택)
        <select
          name="profileId"
          defaultValue={instructor.profile_id ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="">연결 안 함</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.username})
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-400">
          연결하면 회원코드 관리에서 이 계정을 삭제할 때 강사 카드도 함께 삭제됩니다.
        </span>
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark sm:col-span-2">
          저장되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:col-span-2"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
