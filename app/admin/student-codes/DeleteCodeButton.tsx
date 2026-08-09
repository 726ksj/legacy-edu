"use client";

import { useActionState, useState } from "react";
import { deleteStudentCode, type DeleteStudentCodeState } from "./actions";

const initialState: DeleteStudentCodeState = {};

export default function DeleteCodeButton({
  codeId,
  isUsed,
}: {
  codeId: string;
  isUsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boundDelete = deleteStudentCode.bind(null, codeId);
  const [state, formAction, isPending] = useActionState(
    boundDelete,
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-red-500 hover:text-red-600"
      >
        삭제
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 text-left shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-zinc-900">
              정말로 삭제하시겠습니까?
            </p>
            {isUsed && (
              <p className="mt-2 text-sm text-red-500">
                이 코드로 가입한 학생 계정(로그인 정보, 이름, 주소 등)도
                함께 삭제됩니다.
              </p>
            )}
            {state.error && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {state.error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
              >
                취소
              </button>
              <form action={formAction}>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {isPending ? "삭제 중..." : "삭제"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
