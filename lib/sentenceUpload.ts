// 문장 배열 엑셀 업로드의 헤더/행 검증. ExcelJS와 무관한 순수 함수로 두어
// 서버 액션(미리보기·등록)과 단위 테스트가 같은 규칙을 쓴다.
//
// 한 행이 한 문제다: A열 "첫 문장"(주어진 문장) 뒤에 이어지는 문장들을 정답 순서대로
// B열부터 한 칸에 한 문장씩(1번째, 2번째, …) 입력한다. 학생에게는 서버가 문장을
// 섞어 (A)(B)(C)…로 보여 주고 순서를 맞히게 한다.

export const MAX_SENTENCE_QUESTIONS = 20;
export const MIN_SENTENCES = 3;
export const MAX_SENTENCES = 10;

export const INTRO_HEADER = "첫 문장";
export const sentenceHeader = (index: number) => `${index}번째`;
export const SENTENCE_HEADERS = Array.from({ length: MAX_SENTENCES }, (_, i) => sentenceHeader(i + 1));
export const SENTENCE_TEMPLATE_HEADERS = [INTRO_HEADER, ...SENTENCE_HEADERS] as const;

export interface SentenceRowInput {
  row: number;
  intro: string;
  // 1번째~10번째 칸의 원본(빈 칸은 빈 문자열). 길이는 항상 MAX_SENTENCES.
  cells: string[];
}

export interface SentencePreviewRow {
  row: number;
  intro: string;
  // 공백을 정리한 문장들(정답 순서). 오류가 있어도 채워진 칸은 보여 준다.
  sentences: string[];
  // 이 행의 오류 사유. 없으면 정상.
  error?: string;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

// 필수 열: 첫 문장, 1번째~3번째. 4번째 이후는 있어도 되고 없어도 된다.
export function findMissingSentenceHeaders(headers: string[]): string[] {
  const present = new Set(headers.map((h) => h.trim()));
  const required = [INTRO_HEADER, ...SENTENCE_HEADERS.slice(0, MIN_SENTENCES)];
  return required.filter((header) => !present.has(header));
}

// 행별 검증과 공백 정리.
//  - 첫 문장 필수, 이어지는 문장은 3~10개
//  - 문장은 1번째부터 빈 칸 없이 이어져야 한다(중간에 빈 칸이 있으면 오류)
//  - 문장끼리(첫 문장 포함) 서로 달라야 한다(같으면 학생이 구분할 수 없다)
//  - 같은 첫 문장은 한 번만
export function annotateSentenceRows(rows: SentenceRowInput[]): SentencePreviewRow[] {
  const seenIntro = new Map<string, number>();

  return rows.map((input) => {
    const intro = normalize(input.intro);
    const cells = Array.from({ length: MAX_SENTENCES }, (_, i) => normalize(input.cells[i] ?? ""));
    let last = -1;
    cells.forEach((cell, i) => {
      if (cell) last = i;
    });
    const sentences = cells.slice(0, last + 1);
    const row: SentencePreviewRow = { row: input.row, intro, sentences };

    if (!intro) {
      row.error = `${INTRO_HEADER}이(가) 비어 있습니다.`;
      return row;
    }
    const gap = sentences.findIndex((s) => !s);
    if (gap !== -1) {
      row.error = `${sentenceHeader(gap + 1)}가 비어 있습니다. 문장은 빈 칸 없이 이어서 입력하세요.`;
      return row;
    }
    if (sentences.length < MIN_SENTENCES) {
      row.error = `이어지는 문장이 ${MIN_SENTENCES}개 이상이어야 합니다.`;
      return row;
    }
    const keys = [intro, ...sentences].map((s) => s.toLowerCase());
    if (new Set(keys).size < keys.length) {
      row.error = "같은 문장이 두 번 이상 들어 있습니다.";
      return row;
    }

    const key = intro.toLowerCase();
    const first = seenIntro.get(key);
    if (first !== undefined) {
      row.error = `${first}행과 같은 첫 문장입니다.`;
    } else {
      seenIntro.set(key, input.row);
    }
    return row;
  });
}

export function countSentenceErrors(rows: SentencePreviewRow[]): number {
  return rows.filter((row) => row.error).length;
}
