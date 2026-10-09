"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { cellToString } from "@/lib/scoreUpload";
import { parseWeekField } from "@/lib/weeks";
import { validateWeekForCourse } from "@/lib/courseWeeks";
import {
  MAX_WRITING_SENTENCES,
  REQUIRED_WRITING_HEADERS,
  annotateWritingRows,
  countWritingErrors,
  findMissingWritingHeaders,
  type WritingPreviewRow,
  type WritingRowInput,
} from "@/lib/writingUpload";

function revalidateWritingPages(courseId: string) {
  revalidatePath(`/mypage/teaching/${courseId}`, "layout");
}

async function assertWritingSetInCourse(
  supabase: ReturnType<typeof createAdminClient>,
  setId: string,
  courseId: string,
) {
  const { data } = await supabase
    .from("writing_sets")
    .select("id")
    .eq("id", setId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!data) {
    throw new Error("이 강좌의 서술형 세트가 아닙니다.");
  }
}

export interface WritingPreviewState {
  error?: string;
  fileName?: string;
  rows?: WritingPreviewRow[];
}

// 엑셀을 읽어 DB에 쓰지 않고 행별 검증 결과만 돌려준다(미리보기). 오류가 있으면
// 엑셀을 고쳐 다시 올리게 하고, 오류가 없을 때만 registerWritingSet으로 등록한다.
export async function previewWritingSet(
  courseId: string,
  _prevState: WritingPreviewState,
  formData: FormData,
): Promise<WritingPreviewState> {
  await requireCourseManager(courseId);
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "엑셀 파일을 선택해주세요." };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { error: "엑셀 파일을 읽지 못했습니다. .xlsx 파일인지 확인해주세요." };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { error: "시트를 찾을 수 없습니다." };
  }

  const columnIndex = new Map<string, number>();
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = cellToString(cell.value).trim();
    if (header) {
      headers.push(header);
      columnIndex.set(header, colNumber);
    }
  });

  const missing = findMissingWritingHeaders(headers);
  if (missing.length > 0) {
    return {
      error: `엑셀 첫 행에 다음 열이 없습니다: ${missing.join(", ")} (필수 열: ${REQUIRED_WRITING_HEADERS.join(", ")})`,
    };
  }

  const inputs: WritingRowInput[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (header: string) => {
      const col = columnIndex.get(header);
      return col ? cellToString(row.getCell(col).value) : "";
    };
    const input: WritingRowInput = {
      row: rowNumber,
      english: get("영어 문장"),
      korean: get("우리말"),
      chunksText: get("배열 단위"),
      keyPhrasesText: get("핵심 어구"),
    };
    // 완전히 빈 행은 조용히 건너뛴다 (엑셀 끝부분에 흔함).
    if (!input.english && !input.korean && !input.chunksText && !input.keyPhrasesText) return;
    inputs.push(input);
  });

  if (inputs.length === 0) {
    return { error: "업로드할 문장이 없습니다." };
  }
  if (inputs.length > MAX_WRITING_SENTENCES) {
    return {
      error: `한 세트에는 문장 ${MAX_WRITING_SENTENCES}개까지 등록할 수 있습니다. 파일을 나눠 올려주세요.`,
    };
  }

  return { fileName: file.name, rows: annotateWritingRows(inputs) };
}

export interface RegisterWritingSetInput {
  title: string;
  week: number | null;
  sentences: WritingRowInput[];
}

// 미리보기에서 오류가 없던 문장을 서술형 세트로 저장한다. 클라이언트가 보낸
// 값이라 서버에서 같은 규칙으로 한 번 더 검증한다.
export async function registerWritingSet(
  courseId: string,
  input: RegisterWritingSetInput,
): Promise<{ error?: string; successCount?: number }> {
  const user = await requireCourseManager(courseId);
  const title = input.title.trim();
  const week = parseWeekField(input.week === null ? null : String(input.week));

  if (!week) {
    return { error: "주차를 선택해주세요." };
  }
  const weekError = await validateWeekForCourse(courseId, week);
  if (weekError) {
    return { error: weekError };
  }
  if (!title) {
    return { error: "서술형 세트 제목을 입력해주세요." };
  }
  if (input.sentences.length === 0 || input.sentences.length > MAX_WRITING_SENTENCES) {
    return { error: "등록할 문장이 올바르지 않습니다." };
  }

  const rows = annotateWritingRows(input.sentences);
  if (countWritingErrors(rows) > 0) {
    return {
      error: "오류가 있는 행이 있어 등록할 수 없습니다. 엑셀을 수정해 다시 올려주세요.",
    };
  }

  const supabase = createAdminClient();

  const { data: writingSet, error: setError } = await supabase
    .from("writing_sets")
    .insert({ course_id: courseId, week, title, created_by: user.id })
    .select("id")
    .single();
  if (setError || !writingSet) {
    return { error: `세트 생성 중 오류가 발생했습니다: ${setError?.message ?? ""}` };
  }

  const { error: sentencesError } = await supabase.from("writing_sentences").insert(
    rows.map((row, index) => ({
      writing_set_id: writingSet.id,
      order_no: index + 1,
      english: row.english,
      korean: row.korean,
      chunks: row.chunks,
      key_phrases: row.keyPhrases,
    })),
  );
  if (sentencesError) {
    // 문장 저장에 실패하면 방금 만든 세트도 함께 정리해서 빈 세트가 남지 않게 한다.
    await supabase.from("writing_sets").delete().eq("id", writingSet.id);
    return { error: `문장 저장 중 오류가 발생했습니다: ${sentencesError.message}` };
  }

  revalidateWritingPages(courseId);
  return { successCount: rows.length };
}

export async function deleteWritingSet(setId: string, courseId: string) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await assertWritingSetInCourse(supabase, setId, courseId);

  await supabase.from("writing_sets").delete().eq("id", setId);
  revalidateWritingPages(courseId);
}

// 학생에게 임시로 숨기거나 다시 공개한다. 문장은 그대로 두고 is_hidden만 바꾼다.
export async function setWritingSetHidden(setId: string, courseId: string, hidden: boolean) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await assertWritingSetInCourse(supabase, setId, courseId);

  await supabase.from("writing_sets").update({ is_hidden: hidden }).eq("id", setId);
  revalidateWritingPages(courseId);
}
