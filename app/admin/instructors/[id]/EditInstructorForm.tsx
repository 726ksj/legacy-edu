"use client";

import { useActionState } from "react";
import { updateInstructor, type InstructorFormState } from "../actions";

const initialState: InstructorFormState = {};

interface InstructorData {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
}

export default function EditInstructorForm({
  instructor,
}: {
  instructor: InstructorData;
}) {
  const boundUpdateInstructor = updateInstructor.bind(null, instructor.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdateInstructor,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
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
        사진 URL
        <input
          name="photoUrl"
          defaultValue={instructor.photo_url ?? ""}
          placeholder="https://..."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        소개
        <textarea
          name="bio"
          defaultValue={instructor.bio ?? ""}
          rows={4}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">저장되었습니다.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
