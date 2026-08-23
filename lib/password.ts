export const PASSWORD_REQUIREMENT_TEXT = "영문 + 숫자 조합 8자 이상";

export function isValidPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
}
