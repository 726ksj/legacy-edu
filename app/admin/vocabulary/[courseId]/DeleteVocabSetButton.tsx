"use client";

export default function DeleteVocabSetButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("이 단어장을 삭제할까요? 단어와 배정 정보도 함께 삭제됩니다.")) {
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
