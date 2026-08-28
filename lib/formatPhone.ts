// 전화번호를 화면에 보여줄 때만 하이픈으로 나눠준다. 저장된 원본 값은
// 그대로 두고(매칭 로직 등에서 자릿수 기준으로 비교하므로), 표시할 때만
// 이 함수를 거친다.
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return raw;
}
