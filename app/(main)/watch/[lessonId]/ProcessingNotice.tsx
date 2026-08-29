"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 10_000;

// 영상이 아직 처리 중일 때만 렌더링된다. 처리가 끝나 status가 바뀌면
// 서버 컴포넌트가 다른 분기(재생 플레이어/에러 안내)를 렌더링하면서
// 이 컴포넌트는 언마운트되므로, 폴링을 따로 멈출 필요가 없다.
export default function ProcessingNotice() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-zinc-100">
      <p className="text-sm text-zinc-500">
        영상을 처리하고 있습니다. 잠시 후 자동으로 재생 화면이 나타납니다.
      </p>
    </div>
  );
}
