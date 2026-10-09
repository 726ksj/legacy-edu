// 서술형 문장 엑셀 업로드의 헤더/행 검증. ExcelJS와 무관한 순수 함수로 두어
// 서버 액션(미리보기·등록)과 단위 테스트가 같은 규칙을 쓴다.

export const REQUIRED_WRITING_HEADERS = ["영어 문장", "우리말"] as const;
export const OPTIONAL_WRITING_HEADERS = ["배열 단위", "핵심 어구"] as const;
export const MAX_WRITING_SENTENCES = 20;
export const MIN_WRITING_CHUNKS = 2;

// 배열 단위/핵심 어구 칸에서 항목을 구분하는 문자.
export const CHUNK_SEPARATOR = "/";

export interface WritingRowInput {
  row: number;
  english: string;
  korean: string;
  chunksText: string;
  keyPhrasesText: string;
}

export interface WritingPreviewRow {
  row: number;
  english: string;
  korean: string;
  chunks: string[];
  keyPhrases: string[];
  // 이 행의 오류 사유. 없으면 정상.
  error?: string;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export function findMissingWritingHeaders(headers: string[]): string[] {
  const present = new Set(headers.map((h) => h.trim()));
  return REQUIRED_WRITING_HEADERS.filter((header) => !present.has(header));
}

function splitList(text: string): string[] {
  return text
    .split(CHUNK_SEPARATOR)
    .map((part) => normalize(part))
    .filter(Boolean);
}

// 행별 검증과 배열 단위/핵심 어구 정리.
//  - 영어 문장, 우리말은 필수
//  - 배열 단위를 비우면 공백 기준으로 자동 분할한다
//  - 배열 단위를 이어 붙이면 영어 문장과 같아야 한다(공백 차이는 무시)
//  - 배열 단위는 2개 이상
//  - 핵심 어구는 배열 단위 중 하나와 같아야 한다
//  - 같은 영어 문장은 한 번만
export function annotateWritingRows(rows: WritingRowInput[]): WritingPreviewRow[] {
  const seenEnglish = new Map<string, number>();

  return rows.map((input) => {
    const english = normalize(input.english);
    const korean = normalize(input.korean);
    const explicitChunks = splitList(input.chunksText);
    const chunks = explicitChunks.length > 0 ? explicitChunks : english.split(" ").filter(Boolean);
    const keyPhrases = splitList(input.keyPhrasesText);
    const row: WritingPreviewRow = { row: input.row, english, korean, chunks, keyPhrases };

    const missing = [!english && "영어 문장", !korean && "우리말"].filter(Boolean);
    if (missing.length > 0) {
      row.error = `${missing.join(", ")}이(가) 비어 있습니다.`;
      return row;
    }

    if (chunks.length < MIN_WRITING_CHUNKS) {
      row.error = `배열 단위가 ${MIN_WRITING_CHUNKS}개 이상이어야 합니다.`;
      return row;
    }
    if (normalize(chunks.join(" ")) !== english) {
      row.error = "배열 단위를 이어 붙이면 영어 문장과 같아야 합니다.";
      return row;
    }
    const unknown = keyPhrases.find((phrase) => !chunks.includes(phrase));
    if (unknown) {
      row.error = `핵심 어구 "${unknown}"가 배열 단위에 없습니다.`;
      return row;
    }

    const key = english.toLowerCase();
    const first = seenEnglish.get(key);
    if (first !== undefined) {
      row.error = `${first}행과 같은 문장입니다.`;
    } else {
      seenEnglish.set(key, input.row);
    }
    return row;
  });
}

export function countWritingErrors(rows: WritingPreviewRow[]): number {
  return rows.filter((row) => row.error).length;
}
