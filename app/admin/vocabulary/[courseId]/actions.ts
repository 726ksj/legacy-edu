"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { cellToString } from "@/lib/scoreUpload";
import { parseWeekField } from "@/lib/weeks";
import { validateWeekForCourse } from "@/lib/courseWeeks";

async function assertVocabSetInCourse(
  supabase: ReturnType<typeof createAdminClient>,
  vocabSetId: string,
  courseId: string,
) {
  const { data } = await supabase
    .from("vocab_assignments")
    .select("id")
    .eq("vocab_set_id", vocabSetId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!data) {
    throw new Error("이 강좌의 단어장이 아닙니다.");
  }
}

// 같은 액션을 관리자 화면과 강사 화면(마이페이지 > 내 강좌 관리)이 함께
// 쓰므로 두 경로 모두 갱신한다.
function revalidateVocabPages(courseId: string) {
  revalidatePath(`/admin/vocabulary/${courseId}`);
  revalidatePath(`/mypage/teaching/${courseId}`, "layout");
}

export interface UploadVocabSetResultRow {
  row: number;
  word: string;
  reason: string;
}

export interface UploadVocabSetState {
  error?: string;
  successCount?: number;
  failed?: UploadVocabSetResultRow[];
}

const REQUIRED_HEADERS = ["단어", "뜻"] as const;
const EXAMPLE_HEADERS = ["예시 문장", "예시문장", "예문"] as const;

export async function uploadVocabSet(
  courseId: string,
  _prevState: UploadVocabSetState,
  formData: FormData,
): Promise<UploadVocabSetState> {
  const user = await requireCourseManager(courseId);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("file");
  const week = parseWeekField(formData.get("week"));

  if (!week) {
    return { error: "주차를 선택해주세요." };
  }
  const weekError = await validateWeekForCourse(courseId, week);
  if (weekError) {
    return { error: weekError };
  }
  if (!title) {
    return { error: "단어장 제목을 입력해주세요." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해주세요." };
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
    word: string;
    meaning: string;
    example: string;
  }

  const parsedRows: ParsedRow[] = [];
  const failed: UploadVocabSetResultRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (header: string) => {
      const col = columnIndex.get(header);
      if (!col) return "";
      return cellToString(row.getCell(col).value);
    };

    const word = get("단어");
    const meaning = get("뜻");
    const example =
      EXAMPLE_HEADERS.map((header) => get(header)).find(Boolean) ?? "";

    // 완전히 빈 행은 조용히 건너뛴다 (엑셀 끝부분에 흔함).
    if (!word && !meaning) return;

    if (!word || !meaning) {
      failed.push({
        row: rowNumber,
        word,
        reason: "단어와 뜻은 필수입니다.",
      });
      return;
    }

    parsedRows.push({ row: rowNumber, word, meaning, example });
  });

  if (parsedRows.length === 0 && failed.length === 0) {
    return { error: "업로드할 단어가 없습니다." };
  }

  const supabase = createAdminClient();

  const { data: vocabSet, error: setError } = await supabase
    .from("vocab_sets")
    .insert({
      title,
      description: description || null,
      week,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (setError || !vocabSet) {
    return {
      error: `단어장 생성 중 오류가 발생했습니다: ${setError?.message ?? ""}`,
    };
  }

  if (parsedRows.length > 0) {
    const { error: wordsError } = await supabase.from("vocab_words").insert(
      parsedRows.map((row, index) => ({
        vocab_set_id: vocabSet.id,
        word: row.word,
        meaning: row.meaning,
        example: row.example || null,
        sort_order: index,
      })),
    );

    if (wordsError) {
      // 단어 저장에 실패하면 방금 만든 단어장도 함께 정리해서 빈
      // 단어장이 남지 않게 한다.
      await supabase.from("vocab_sets").delete().eq("id", vocabSet.id);
      return {
        error: `단어 저장 중 오류가 발생했습니다: ${wordsError.message}`,
      };
    }
  }

  const { error: assignError } = await supabase
    .from("vocab_assignments")
    .insert({ vocab_set_id: vocabSet.id, course_id: courseId });

  if (assignError) {
    return {
      error: `강좌 배정 중 오류가 발생했습니다: ${assignError.message}`,
    };
  }

  revalidateVocabPages(courseId);
  return { successCount: parsedRows.length, failed };
}

export async function deleteVocabSet(vocabSetId: string, courseId: string) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await assertVocabSetInCourse(supabase, vocabSetId, courseId);

  await supabase.from("vocab_sets").delete().eq("id", vocabSetId);
  revalidateVocabPages(courseId);
}

export async function updateVocabSetWeek(
  vocabSetId: string,
  courseId: string,
  week: number | null,
) {
  await requireCourseManager(courseId);
  if (await validateWeekForCourse(courseId, week)) return;
  const supabase = createAdminClient();
  await assertVocabSetInCourse(supabase, vocabSetId, courseId);

  await supabase.from("vocab_sets").update({ week }).eq("id", vocabSetId);
  revalidateVocabPages(courseId);
}
