"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteStudentCode, type DeleteStudentCodeState } from "./actions";

const initialState: DeleteStudentCodeState = {};

export default function DeleteCodeButton({
  codeId,
  isUsed,
}: {
  codeId: string;
  isUsed: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundDelete = deleteStudentCode.bind(null, codeId);
  const [state, formAction, isPending] = useActionState(
    boundDelete,
    initialState,
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          timeoutRef.current = setTimeout(() => setConfirming(false), 5000);
        }}
        className="text-xs font-semibold text-red-500 hover:text-red-600"
      >
        삭제
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col items-end gap-1"
    >
      {isUsed && (
        <p className="text-right text-[11px] leading-tight text-red-500">
          이 코드로 가입한 학생 계정도 함께 삭제됩니다.
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setConfirming(false);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-bold text-red-600 underline hover:text-red-700 disabled:opacity-60"
        >
          {isPending ? "삭제 중..." : "정말로 삭제하시겠습니까?"}
        </button>
      </div>
      {state.error && (
        <p className="text-right text-xs font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
