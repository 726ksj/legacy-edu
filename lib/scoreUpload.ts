import { randomUUID } from "crypto";
import type ExcelJS from "exceljs";

// 슬러그는 score_reports.report_type과 연결되는 내부 식별자라 관리자가
// 직접 입력할 필요가 없다. 이름을 영문/숫자로 최대한 살려서 만들고,
// 한글뿐이라 남는 게 없으면 임의 문자열로 대체한다.
export function slugify(label: string) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const suffix = randomUUID().slice(0, 8);
  return base ? `${base}_${suffix}` : `category_${suffix}`;
}

// "백분위, 등급" 같은 콤마 구분 입력을 카테고리별 추가 필드 목록으로 바꾼다.
export function parseExtraFieldLabels(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  ];
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

// 엑셀에서 전화번호를 숫자로 인식하면 앞자리 0이 잘려서 10자리로 남는
// 경우가 많다 (예: 01012345678 -> 1012345678). 국내 휴대폰 번호는 항상
// 0으로 시작하므로, 10자리이고 0으로 시작하지 않으면 보정해준다.
export function normalizePhoneDigits(raw: string) {
  const digits = digitsOnly(raw);
  if (digits.length === 10 && !digits.startsWith("0")) {
    return `0${digits}`;
  }
  return digits;
}

export function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("result" in value) {
      return cellToString(value.result ?? "");
    }
    if ("text" in value) {
      return String(value.text ?? "");
    }
    return "";
  }
  return String(value).trim();
}
