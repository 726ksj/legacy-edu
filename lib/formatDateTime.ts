// `.toLocaleString("ko-KR")`는 오전/오후 표기 방식이 서버(Node)와 브라우저
// 간에 달라서 hydration mismatch를 일으킨다. hour12를 명시적으로 꺼서
// 24시간제로 통일하면 환경에 상관없이 항상 같은 문자열이 나온다.
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

// 시간까지는 필요 없고 등록일만 보여주면 되는 목록/게시판류 화면에서 쓴다.
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}
