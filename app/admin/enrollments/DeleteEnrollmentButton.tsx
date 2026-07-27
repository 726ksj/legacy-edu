"use client";

export default function DeleteEnrollmentButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("이 학생의 수강 권한을 해지할까요?")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs font-semibold text-red-500 hover:text-red-600"
      >
        해지
      </button>
    </form>
  );
}
