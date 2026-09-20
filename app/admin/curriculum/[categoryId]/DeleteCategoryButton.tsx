"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCategoryButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          !window.confirm(
            "이 커리큘럼을 삭제할까요? 등록된 단계도 모두 함께 삭제됩니다.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          await action();
          router.push("/admin/curriculum");
        });
      }}
      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
    >
      {isPending ? "삭제 중..." : "커리큘럼 삭제"}
    </button>
  );
}
