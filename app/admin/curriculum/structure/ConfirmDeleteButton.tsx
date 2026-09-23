"use client";

export default function ConfirmDeleteButton({
  action,
  confirmMessage,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
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
