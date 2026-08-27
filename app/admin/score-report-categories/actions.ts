"use server";

import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CategoryActionState {
  error?: string;
  success?: boolean;
}

// 슬러그는 score_reports.report_type과 연결되는 내부 식별자라 관리자가
// 직접 입력할 필요가 없다. 이름을 영문/숫자로 최대한 살려서 만들고,
// 한글뿐이라 남는 게 없으면 임의 문자열로 대체한다.
function slugify(label: string) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const suffix = randomUUID().slice(0, 8);
  return base ? `${base}_${suffix}` : `category_${suffix}`;
}

function revalidateCategoryPaths() {
  revalidatePath("/admin/score-report-categories");
  revalidatePath("/admin/users/[id]", "layout");
  revalidatePath("/mypage/score-report");
  revalidatePath("/mypage/score-report/[slug]", "layout");
}

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!label) {
    return { error: "이름을 입력해주세요." };
  }

  const supabase = createAdminClient();

  const { data: lastCategory } = await supabase
    .from("score_report_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("score_report_categories").insert({
    label,
    slug: slugify(label),
    description: description || null,
    sort_order: (lastCategory?.sort_order ?? 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCategoryPaths();
  return { success: true };
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<CategoryActionState> {
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!label) {
    return { error: "이름을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("score_report_categories")
    .update({ label, description: description || null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateCategoryPaths();
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient();
  await supabase.from("score_report_categories").delete().eq("id", id);
  revalidateCategoryPaths();
}

export interface UploadResultRow {
  row: number;
  name: string;
  phone: string;
  reason: string;
}

export interface UploadState {
  error?: string;
  successCount?: number;
  failed?: UploadResultRow[];
}

// 학교/학년은 참고용으로만 받고 매칭에는 쓰지 않는다.
const REQUIRED_HEADERS = ["이름", "전화번호", "점수"] as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

// 엑셀에서 전화번호를 숫자로 인식하면 앞자리 0이 잘려서 10자리로 남는
// 경우가 많다 (예: 01012345678 -> 1012345678). 국내 휴대폰 번호는 항상
// 0으로 시작하므로, 10자리이고 0으로 시작하지 않으면 보정해준다.
function normalizePhoneDigits(raw: string) {
  const digits = digitsOnly(raw);
  if (digits.length === 10 && !digits.startsWith("0")) {
    return `0${digits}`;
  }
  return digits;
}

function cellToString(value: ExcelJS.CellValue): string {
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

export async function uploadScoreReports(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const examTitle = String(formData.get("examTitle") ?? "").trim();
  const examDate = String(formData.get("examDate") ?? "").trim();
  const file = formData.get("file");

  if (!categoryId || !examTitle) {
    return { error: "카테고리와 시험명을 입력해주세요." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해주세요." };
  }

  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("score_report_categories")
    .select("slug")
    .eq("id", categoryId)
    .maybeSingle();

  if (!category) {
    return { error: "존재하지 않는 카테고리입니다." };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      error: "엑셀 파일을 읽지 못했습니다. .xlsx 파일인지 확인해주세요.",
    };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { error: "시트를 찾을 수 없습니다." };
  }

  const headerRow = worksheet.getRow(1);
  const columnIndex = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const header = cellToString(cell.value);
    if (header) columnIndex.set(header, colNumber);
  });

  const missingRequired = REQUIRED_HEADERS.filter(
    (header) => !columnIndex.has(header),
  );
  if (missingRequired.length > 0) {
    return {
      error: `엑셀에 다음 열이 없습니다: ${missingRequired.join(", ")}`,
    };
  }

  interface ParsedRow {
    row: number;
    name: string;
    phone: string;
    username: string;
    score: string;
  }

  const parsedRows: ParsedRow[] = [];
  const failed: UploadResultRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (header: string) => {
      const col = columnIndex.get(header);
      if (!col) return "";
      return cellToString(row.getCell(col).value);
    };

    const name = get("이름");
    const phone = get("전화번호");
    const username = get("아이디");
    const score = get("점수");

    // 완전히 빈 행은 조용히 건너뛴다 (엑셀 끝부분에 흔함).
    if (!name && !phone && !username && !score) return;

    if (!name || !phone || !score) {
      failed.push({
        row: rowNumber,
        name,
        phone,
        reason: "이름, 전화번호, 점수는 필수입니다.",
      });
      return;
    }

    parsedRows.push({ row: rowNumber, name, phone, username, score });
  });

  if (parsedRows.length === 0 && failed.length === 0) {
    return { error: "업로드할 데이터가 없습니다." };
  }

  // 아이디가 있는 행과 없는 행을 나눠서, 있는 쪽은 아이디로만, 없는 쪽은
  // 이름+전화번호로 매칭한다.
  const usernames = [
    ...new Set(parsedRows.filter((r) => r.username).map((r) => r.username)),
  ];
  const names = [
    ...new Set(parsedRows.filter((r) => !r.username).map((r) => r.name)),
  ];

  const [{ data: byUsername }, { data: byName }] = await Promise.all([
    usernames.length
      ? supabase
          .from("profiles")
          .select("id, username, name, phone")
          .in("username", usernames)
      : Promise.resolve({ data: [] as never[] }),
    names.length
      ? supabase
          .from("profiles")
          .select("id, username, name, phone")
          .in("name", names)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const profileByUsername = new Map(
    (byUsername ?? []).map((p) => [p.username, p]),
  );
  const profilesByName = new Map<string, { id: string; phone: string }[]>();
  for (const p of byName ?? []) {
    const list = profilesByName.get(p.name) ?? [];
    list.push(p);
    profilesByName.set(p.name, list);
  }

  const inserts: {
    profile_id: string;
    report_type: string;
    title: string;
    score: string;
    exam_date: string | null;
  }[] = [];

  for (const row of parsedRows) {
    let matchedId: string | null = null;

    if (row.username) {
      const match = profileByUsername.get(row.username);
      if (match) matchedId = match.id;
    } else {
      const candidates = profilesByName.get(row.name) ?? [];
      const targetPhone = normalizePhoneDigits(row.phone);
      const match = candidates.find(
        (c) => normalizePhoneDigits(c.phone) === targetPhone,
      );
      if (match) matchedId = match.id;
    }

    if (!matchedId) {
      failed.push({
        row: row.row,
        name: row.name,
        phone: row.phone,
        reason: row.username
          ? "해당 아이디의 회원을 찾을 수 없습니다."
          : "이름+전화번호와 일치하는 회원을 찾을 수 없습니다.",
      });
      continue;
    }

    inserts.push({
      profile_id: matchedId,
      report_type: category.slug,
      title: examTitle,
      score: row.score,
      exam_date: examDate || null,
    });
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("score_reports").insert(inserts);
    if (error) {
      return { error: `저장 중 오류가 발생했습니다: ${error.message}` };
    }
  }

  revalidateCategoryPaths();

  return { successCount: inserts.length, failed };
}
