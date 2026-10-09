// 단어장 엑셀 업로드의 헤더/행 검증. ExcelJS와 무관한 순수 함수로 두어
// 서버 액션(미리보기·등록)과 단위 테스트가 같은 규칙을 쓴다.

export const REQUIRED_VOCAB_HEADERS = ["단어", "뜻", "예시 문장"] as const;

// "예시 문장" 열은 아래 이름 중 어느 것으로 적어도 같은 열로 취급한다.
const EXAMPLE_HEADER_ALIASES = ["예시 문장", "예시문장", "예문"];

export interface VocabRowInput {
  row: number;
  word: string;
  meaning: string;
  example: string;
}

export interface VocabPreviewRow extends VocabRowInput {
  // 이 행의 오류 사유. 없으면 정상.
  error?: string;
}

export function normalizeHeader(header: string): string {
  const trimmed = header.trim();
  return EXAMPLE_HEADER_ALIASES.includes(trimmed) ? "예시 문장" : trimmed;
}

// 필수 열(단어, 뜻, 예시 문장) 중 엑셀 첫 행에 없는 것의 이름.
export function findMissingHeaders(headers: string[]): string[] {
  const normalized = new Set(headers.map(normalizeHeader));
  return REQUIRED_VOCAB_HEADERS.filter((header) => !normalized.has(header));
}

// 행별 오류를 붙인다: 단어/뜻/예시 문장은 모두 필수이고, 같은 단어는
// 한 번만 쓸 수 있다(대소문자 무시).
export function annotateVocabRows(rows: VocabRowInput[]): VocabPreviewRow[] {
  const firstRowOfWord = new Map<string, number>();

  return rows.map((input) => {
    const word = input.word.trim();
    const meaning = input.meaning.trim();
    const example = input.example.trim();
    const row: VocabPreviewRow = { row: input.row, word, meaning, example };

    const missing = [
      !word && "단어",
      !meaning && "뜻",
      !example && "예시 문장",
    ].filter(Boolean);
    if (missing.length > 0) {
      row.error = `${missing.join(", ")}이(가) 비어 있습니다.`;
      return row;
    }

    const key = word.toLowerCase();
    const first = firstRowOfWord.get(key);
    if (first !== undefined) {
      row.error = `${first}행과 같은 단어입니다.`;
    } else {
      firstRowOfWord.set(key, input.row);
    }
    return row;
  });
}

export function countVocabErrors(rows: VocabPreviewRow[]): number {
  return rows.filter((row) => row.error).length;
}
