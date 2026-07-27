"use client";

export default function DeleteCourseButton({
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
            "이 강좌를 삭제할까요? 강좌에 속한 모든 차시(영상)와 수강 등록 정보도 함께 삭제됩니다.",
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
