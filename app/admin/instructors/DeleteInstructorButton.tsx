"use client";

export default function DeleteInstructorButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
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
        className="text-xs font-semibold text-red-500 hover:text-red-600"
      >
        삭제
      </button>
    </form>
  );
}
