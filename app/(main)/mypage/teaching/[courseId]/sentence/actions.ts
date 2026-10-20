"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { cellToString } from "@/lib/scoreUpload";
import { parseWeekField } from "@/lib/weeks";
import { validateWeekForCourse } from "@/lib/courseWeeks";
import {
  INTRO_HEADER,
  MAX_SENTENCES,
  MAX_SENTENCE_QUESTIONS,
  SENTENCE_TEMPLATE_HEADERS,
  annotateSentenceRows,
  countSentenceErrors,
  findMissingSentenceHeaders,
  type SentencePreviewRow,
  type SentenceRowInput,
} from "@/lib/sentenceUpload";

function revalidateSentencePages(courseId: string) {
  revalidatePath(`/mypage/teaching/${courseId}`, "layout");
}

async function assertSentenceSetInCourse(
  supabase: ReturnType<typeof createAdminClient>,
  setId: string,
  courseId: string,
) {
  const { data } = await supabase
    .from("sentence_sets")
    .select("id")
    .eq("id", setId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!data) {
    throw new Error("이 강좌의 문장 배열 세트가 아닙니다.");
  }
}

export interface SentencePreviewState {
  error?: string;
  fileName?: string;
  rows?: SentencePreviewRow[];
}

// 엑셀을 읽어 DB에 쓰지 않고 행별 검증 결과만 돌려준다(미리보기). 오류가 있으면
// 엑셀을 고쳐 다시 올리게 하고, 오류가 없을 때만 registerSentenceSet으로 등록한다.
export async function previewSentenceSet(
  courseId: string,
  _prevState: SentencePreviewState,
  formData: FormData,
): Promise<SentencePreviewState> {
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

  const missing = findMissingSentenceHeaders(headers);
  if (missing.length > 0) {
    return {
      error: `엑셀 첫 행에 다음 열이 없습니다: ${missing.join(", ")} (필수 열: ${SENTENCE_TEMPLATE_HEADERS.slice(0, 4).join(", ")})`,
    };
  }

  const inputs: SentenceRowInput[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (header: string) => {
      const col = columnIndex.get(header);
      return col ? cellToString(row.getCell(col).value) : "";
    };
    const input: SentenceRowInput = {
      row: rowNumber,
      intro: get(INTRO_HEADER),
      cells: Array.from({ length: MAX_SENTENCES }, (_, i) => get(`${i + 1}번째`)),
    };
    // 완전히 빈 행은 조용히 건너뛴다 (엑셀 끝부분에 흔함).
    if (!input.intro && input.cells.every((cell) => !cell)) return;
    inputs.push(input);
  });

  if (inputs.length === 0) {
    return { error: "업로드할 문제가 없습니다." };
  }
  if (inputs.length > MAX_SENTENCE_QUESTIONS) {
    return {
      error: `한 세트에는 문제 ${MAX_SENTENCE_QUESTIONS}개까지 등록할 수 있습니다. 파일을 나눠 올려주세요.`,
    };
  }

  return { fileName: file.name, rows: annotateSentenceRows(inputs) };
}

export interface RegisterSentenceSetInput {
  title: string;
  week: number | null;
  questions: SentenceRowInput[];
}

// 미리보기에서 오류가 없던 문제를 문장 배열 세트로 저장한다. 클라이언트가 보낸
// 값이라 서버에서 같은 규칙으로 한 번 더 검증한다.
export async function registerSentenceSet(
  courseId: string,
  input: RegisterSentenceSetInput,
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
    return { error: "문장 배열 세트 제목을 입력해주세요." };
  }
  if (input.questions.length === 0 || input.questions.length > MAX_SENTENCE_QUESTIONS) {
    return { error: "등록할 문제가 올바르지 않습니다." };
  }

  const rows = annotateSentenceRows(input.questions);
  if (countSentenceErrors(rows) > 0) {
    return {
      error: "오류가 있는 행이 있어 등록할 수 없습니다. 엑셀을 수정해 다시 올려주세요.",
    };
  }

  const supabase = createAdminClient();

  const { data: sentenceSet, error: setError } = await supabase
    .from("sentence_sets")
    .insert({ course_id: courseId, week, title, created_by: user.id })
    .select("id")
    .single();
  if (setError || !sentenceSet) {
    return { error: `세트 생성 중 오류가 발생했습니다: ${setError?.message ?? ""}` };
  }

  const { error: questionsError } = await supabase.from("sentence_questions").insert(
    rows.map((row, index) => ({
      sentence_set_id: sentenceSet.id,
      order_no: index + 1,
      intro: row.intro,
      sentences: row.sentences,
    })),
  );
  if (questionsError) {
    // 문제 저장에 실패하면 방금 만든 세트도 함께 정리해서 빈 세트가 남지 않게 한다.
    await supabase.from("sentence_sets").delete().eq("id", sentenceSet.id);
    return { error: `문제 저장 중 오류가 발생했습니다: ${questionsError.message}` };
  }

  revalidateSentencePages(courseId);
  return { successCount: rows.length };
}

export async function deleteSentenceSet(setId: string, courseId: string) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await assertSentenceSetInCourse(supabase, setId, courseId);

  await supabase.from("sentence_sets").delete().eq("id", setId);
  revalidateSentencePages(courseId);
}

// 학생에게 임시로 숨기거나 다시 공개한다. 문제는 그대로 두고 is_hidden만 바꾼다.
export async function setSentenceSetHidden(setId: string, courseId: string, hidden: boolean) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await assertSentenceSetInCourse(supabase, setId, courseId);

  await supabase.from("sentence_sets").update({ is_hidden: hidden }).eq("id", setId);
  revalidateSentencePages(courseId);
}
