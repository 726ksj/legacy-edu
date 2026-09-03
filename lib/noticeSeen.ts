export const NOTICE_SEEN_STORAGE_KEY = "notice_last_seen_id";
// localStorage 변경은 같은 탭 안에서는 'storage' 이벤트가 안 뜨므로(다른
// 탭/창에서만 발생), 같은 탭에서 헤더의 NEW 뱃지를 즉시 갱신하려면 직접
// 커스텀 이벤트를 쏴줘야 한다.
export const NOTICE_SEEN_EVENT = "notice-seen-updated";
