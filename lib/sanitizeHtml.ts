import DOMPurify from "isomorphic-dompurify";

// 공지사항 리치텍스트 에디터가 만들어내는 태그/속성만 허용한다. 저장
//시점에 한 번 정화해두면, 렌더링할 때마다 다시 정화할 필요가 없다.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "span",
  "ul",
  "ol",
  "li",
];

export function sanitizeNoticeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["style"],
    ALLOWED_URI_REGEXP: /^$/, // 이 태그들엔 href/src가 없으니 링크류는 전부 막는다
  });
}
