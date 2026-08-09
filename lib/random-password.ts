// 0/O, 1/I/l처럼 헷갈리기 쉬운 문자는 제외
const PASSWORD_ALPHABET =
  "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

export function generateRandomPassword(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length],
  ).join("");
}
