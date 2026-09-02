"use client";

export default function DeleteNoteButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("이 질문을 삭제할까요? 되돌릴 수 없습니다.")) {
          e.preventDefault();
        }
      }}
      className="contents"
    >
      <button
        type="submit"
        className="text-xs font-semibold text-red-500 hover:text-red-600"
      >
        삭제
      </button>
    </form>
  );
}
