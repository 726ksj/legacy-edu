"use client";

export default function DeleteUserButton({
  action,
  label = "탈퇴",
  variant = "link",
}: {
  action: () => Promise<void>;
  label?: string;
  variant?: "link" | "button";
}) {
  return (
    <form
      action={action}
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
        className={
          variant === "button"
            ? "rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            : "text-xs font-semibold text-red-500 hover:text-red-600"
        }
      >
        {label}
      </button>
    </form>
  );
}
