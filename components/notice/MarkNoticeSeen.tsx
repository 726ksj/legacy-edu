"use client";

import { useEffect } from "react";
import { NOTICE_SEEN_EVENT, NOTICE_SEEN_STORAGE_KEY } from "@/lib/noticeSeen";

// 공지사항 게시판을 방문하면, 그 시점의 최신 글을 "본 것"으로 기록해서
// 헤더의 NEW 뱃지가 사라지게 한다.
export default function MarkNoticeSeen({
  noticeId,
}: {
  noticeId: string | null;
}) {
  useEffect(() => {
    if (!noticeId) return;
    try {
      window.localStorage.setItem(NOTICE_SEEN_STORAGE_KEY, noticeId);
      // 같은 탭에서 헤더의 NoticeNewBadge가 즉시 다시 계산하도록 알려준다.
      window.dispatchEvent(new Event(NOTICE_SEEN_EVENT));
    } catch {
      // 저장소 접근이 막혀 있으면(프라이빗 모드 등) 이번 방문에서는 뱃지가
      // 안 사라질 뿐, 나머지 기능엔 영향 없다.
    }
  }, [noticeId]);

  return null;
}
