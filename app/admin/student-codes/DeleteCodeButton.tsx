"use client";

export default function DeleteCodeButton({
  action,
  isUsed,
}: {
  action: () => Promise<void>;
  isUsed: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const message = isUsed
          ? "이미 사용된 코드입니다. 삭제하면 이 코드로 가입한 학생의 계정(로그인 정보, 이름, 주소 등)이 모두 함께 삭제됩니다. 계속할까요?"
          : "이 코드를 삭제할까요?";
        if (!window.confirm(message)) {
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
