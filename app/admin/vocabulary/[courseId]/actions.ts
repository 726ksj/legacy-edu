"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { cellToString } from "@/lib/scoreUpload";
import { parseWeekField } from "@/lib/weeks";
import { validateWeekForCourse } from "@/lib/courseWeeks";
import {
  REQUIRED_VOCAB_HEADERS,
  annotateVocabRows,
  countVocabErrors,
  findMissingHeaders,
  normalizeHeader,
  type VocabPreviewRow,
  type VocabRowInput,
} from "@/lib/vocabUpload";

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

const MAX_VOCAB_ROWS = 2000;

export interface VocabPreviewState {
  error?: string;
  fileName?: string;
  rows?: VocabPreviewRow[];
}

// 엑셀을 읽어 DB에 쓰지 않고 행별 검증 결과만 돌려준다(미리보기). 오류가 있으면
// 엑셀을 고쳐 다시 올리게 하고, 오류가 없을 때만 registerVocabSet으로 등록한다.
export async function previewVocabSet(
  courseId: string,
  _prevState: VocabPreviewState,
  formData: FormData,
): Promise<VocabPreviewState> {
  await requireCourseManager(courseId);
  const file = formData.get("file");

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

  const columnIndex = new Map<string, number>();
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = cellToString(cell.value);
    if (header) {
      headers.push(header);
      columnIndex.set(normalizeHeader(header), colNumber);
    }
  });

  const missing = findMissingHeaders(headers);
  if (missing.length > 0) {
    return {
      error: `엑셀 첫 행에 다음 열이 없습니다: ${missing.join(", ")} (필수 열: ${REQUIRED_VOCAB_HEADERS.join(", ")})`,
    };
  }

  const inputs: VocabRowInput[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (header: string) => {
      const col = columnIndex.get(header);
      return col ? cellToString(row.getCell(col).value) : "";
    };
    const word = get("단어");
    const meaning = get("뜻");
    const example = get("예시 문장");
    // 완전히 빈 행은 조용히 건너뛴다 (엑셀 끝부분에 흔함).
    if (!word && !meaning && !example) return;
    inputs.push({ row: rowNumber, word, meaning, example });
  });

  if (inputs.length === 0) {
    return { error: "업로드할 단어가 없습니다." };
  }
  if (inputs.length > MAX_VOCAB_ROWS) {
    return {
      error: `한 번에 ${MAX_VOCAB_ROWS}개까지 등록할 수 있습니다. 파일을 나눠 올려주세요.`,
    };
  }

  return { fileName: file.name, rows: annotateVocabRows(inputs) };
}

export interface RegisterVocabSetInput {
  title: string;
  description: string;
  week: number | null;
  words: VocabRowInput[];
}

// 미리보기에서 오류가 없던 행을 단어장으로 저장한다. 클라이언트가 보낸 값이라
// 서버에서 같은 규칙으로 한 번 더 검증한다.
export async function registerVocabSet(
  courseId: string,
  input: RegisterVocabSetInput,
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
    return { error: "단어장 제목을 입력해주세요." };
  }
  if (input.words.length === 0 || input.words.length > MAX_VOCAB_ROWS) {
    return { error: "등록할 단어가 올바르지 않습니다." };
  }

  const rows = annotateVocabRows(input.words);
  if (countVocabErrors(rows) > 0) {
    return { error: "오류가 있는 행이 있어 등록할 수 없습니다. 엑셀을 수정해 다시 올려주세요." };
  }

  const supabase = createAdminClient();

  const { data: vocabSet, error: setError } = await supabase
    .from("vocab_sets")
    .insert({
      title,
      description: input.description.trim() || null,
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

  const { error: wordsError } = await supabase.from("vocab_words").insert(
    rows.map((row, index) => ({
      vocab_set_id: vocabSet.id,
      word: row.word,
      meaning: row.meaning,
      example: row.example,
      sort_order: index,
    })),
  );

  if (wordsError) {
    // 단어 저장에 실패하면 방금 만든 단어장도 함께 정리해서 빈
    // 단어장이 남지 않게 한다.
    await supabase.from("vocab_sets").delete().eq("id", vocabSet.id);
    return { error: `단어 저장 중 오류가 발생했습니다: ${wordsError.message}` };
  }

  const { error: assignError } = await supabase
    .from("vocab_assignments")
    .insert({ vocab_set_id: vocabSet.id, course_id: courseId });

  if (assignError) {
    await supabase.from("vocab_sets").delete().eq("id", vocabSet.id);
    return {
      error: `강좌 배정 중 오류가 발생했습니다: ${assignError.message}`,
    };
  }

  revalidateVocabPages(courseId);
  return { successCount: rows.length };
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

// 단어장을 학생에게 임시로 숨기거나 다시 공개한다. 단어와 배정은 그대로
// 두고 is_hidden만 바꾸므로 다시 공개하면 이전 상태로 돌아온다.
export async function setVocabSetHidden(
  vocabSetId: string,
  courseId: string,
  hidden: boolean,
) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await assertVocabSetInCourse(supabase, vocabSetId, courseId);

  await supabase
    .from("vocab_sets")
    .update({ is_hidden: hidden })
    .eq("id", vocabSetId);
  revalidateVocabPages(courseId);
}
