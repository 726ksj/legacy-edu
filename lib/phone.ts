// 한국 휴대폰 번호 입력 중 자동으로 하이픈을 넣어준다. 숫자만 남기고
// 자릿수에 따라 010-1234-5678 형태로 다시 조립하는 방식이라, 붙여넣기나
// 지우기 중간에 커서가 있어도 항상 일관된 형식을 유지한다.
// guardian_phone처럼 DB에서 null이 허용되는 값을 초기값으로 넣는
// 경우가 있어 null/undefined도 받아들인다.
export function formatPhoneInput(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);

  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
