// 0/O, 1/I/L처럼 헷갈리기 쉬운 문자는 제외
const STUDENT_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateStudentCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => STUDENT_CODE_ALPHABET[b % STUDENT_CODE_ALPHABET.length],
  ).join("");
}
