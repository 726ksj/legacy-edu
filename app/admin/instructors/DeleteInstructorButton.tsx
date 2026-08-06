"use client";

import { useActionState } from "react";
import { deleteInstructor, type DeleteInstructorState } from "./actions";

const initialState: DeleteInstructorState = {};

export default function DeleteInstructorButton({
  instructorId,
}: {
  instructorId: string;
}) {
  const boundDelete = deleteInstructor.bind(null, instructorId);
  const [state, formAction, isPending] = useActionState(
    boundDelete,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "이 강사를 삭제할까요? 이 강사를 사용 중인 강좌에는 더 이상 강사 정보가 표시되지 않습니다.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
      >
        {isPending ? "삭제 중..." : "삭제"}
      </button>
      {state.error && (
        <p className="mt-2 text-xs font-medium text-red-600">{state.error}</p>
      )}
    </form>
  );
}
