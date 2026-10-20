// 순서 배열 엑셀 업로드의 헤더/행 검증. ExcelJS와 무관한 순수 함수로 두어
// 서버 액션(미리보기·등록)과 단위 테스트가 같은 규칙을 쓴다.
//
// 한 행이 한 문제다: A열 "첫 문장"(주어진 글) 뒤에 이어지는 세 덩어리를 정답
// 순서대로 B·C·D열(1번째·2번째·3번째)에 입력한다. 학생에게는 서버가 세 덩어리를
// 섞어 (A)(B)(C)로 보여 주고, 보기도 서버가 만든다.

export const ORDER_HEADERS = ["첫 문장", "1번째", "2번째", "3번째"] as const;
export const MAX_ORDER_QUESTIONS = 20;

export interface OrderRowInput {
  row: number;
  intro: string;
  part1: string;
  part2: string;
  part3: string;
}

export interface OrderPreviewRow extends OrderRowInput {
  // 이 행의 오류 사유. 없으면 정상.
  error?: string;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export function findMissingOrderHeaders(headers: string[]): string[] {
  const present = new Set(headers.map((h) => h.trim()));
  return ORDER_HEADERS.filter((header) => !present.has(header));
}

// 행별 검증과 공백 정리.
//  - 첫 문장, 1번째, 2번째, 3번째는 모두 필수
//  - 세 덩어리는 서로 달라야 한다(같으면 학생이 구분할 수 없다)
//  - 같은 첫 문장은 한 번만
export function annotateOrderRows(rows: OrderRowInput[]): OrderPreviewRow[] {
  const seenIntro = new Map<string, number>();

  return rows.map((input) => {
    const row: OrderPreviewRow = {
      row: input.row,
      intro: normalize(input.intro),
      part1: normalize(input.part1),
      part2: normalize(input.part2),
      part3: normalize(input.part3),
    };

    const missing = [
      !row.intro && "첫 문장",
      !row.part1 && "1번째",
      !row.part2 && "2번째",
      !row.part3 && "3번째",
    ].filter(Boolean);
    if (missing.length > 0) {
      row.error = `${missing.join(", ")}이(가) 비어 있습니다.`;
      return row;
    }

    const parts = [row.part1, row.part2, row.part3].map((p) => p.toLowerCase());
    if (new Set(parts).size < 3) {
      row.error = "1번째·2번째·3번째 내용이 서로 달라야 합니다.";
      return row;
    }

    const key = row.intro.toLowerCase();
    const first = seenIntro.get(key);
    if (first !== undefined) {
      row.error = `${first}행과 같은 첫 문장입니다.`;
    } else {
      seenIntro.set(key, input.row);
    }
    return row;
  });
}

export function countOrderErrors(rows: OrderPreviewRow[]): number {
  return rows.filter((row) => row.error).length;
}
