"use client";

import { useSyncExternalStore } from "react";
import { NOTICE_SEEN_EVENT, NOTICE_SEEN_STORAGE_KEY } from "@/lib/noticeSeen";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(NOTICE_SEEN_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(NOTICE_SEEN_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerSnapshot() {
  return false;
}

export default function NoticeNewBadge({
  noticeId,
}: {
  noticeId: string | null;
}) {
  // 서버 렌더 시점엔 항상 false로 맞춰 hydration 불일치를 피하고, 클라이언트에서만
  // localStorage와 비교한다. 같은 탭에서 /notice를 방문해 MarkNoticeSeen이
  // 기록을 남기면 NOTICE_SEEN_EVENT를 받아 즉시 다시 계산된다.
  const show = useSyncExternalStore(
    subscribe,
    () => {
      if (!noticeId) return false;
      try {
        return window.localStorage.getItem(NOTICE_SEEN_STORAGE_KEY) !== noticeId;
      } catch {
        return true;
      }
    },
    getServerSnapshot,
  );

  if (!show) return null;

  return (
    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      NEW
    </span>
  );
}
