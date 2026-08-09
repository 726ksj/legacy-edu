"use client";

import { useActionState } from "react";
import { deleteUser, type DeleteUserState } from "./actions";

const initialState: DeleteUserState = {};

export default function DeleteUserButton({ userId }: { userId: string }) {
  const boundDelete = deleteUser.bind(null, userId);
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
            "이 회원을 탈퇴 처리할까요? 로그인 계정과 프로필, 수강 등록 정보가 모두 삭제되며 되돌릴 수 없습니다.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
      >
        {isPending ? "처리 중..." : "회원 탈퇴 처리"}
      </button>
      {state.error && (
        <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>
      )}
    </form>
  );
}
