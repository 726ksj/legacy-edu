import ExcelJS from "exceljs";
import { getAuthUser } from "@/lib/supabase/server";
import {
  MAX_SENTENCE_QUESTIONS,
  MAX_SENTENCES,
  MIN_SENTENCES,
  SENTENCE_TEMPLATE_HEADERS,
} from "@/lib/sentenceUpload";

export const dynamic = "force-dynamic";

// 문장 배열 문제 업로드용 엑셀 양식. 한 행이 한 문제이고, A열에 첫 문장, B열부터
// 이어지는 문장을 정답 순서대로 한 칸에 한 문장씩 입력한다.
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("문장 배열");

  sheet.columns = SENTENCE_TEMPLATE_HEADERS.map((header, index) => ({
    header,
    key: header,
    width: index === 0 ? 48 : 40,
  }));
  sheet.getRow(1).font = { bold: true };
  // 첫 열 제목에 메모로 입력 방법을 안내한다(셀 값이 아니라 업로드 읽기에는 영향이 없다).
  sheet.getCell("A1").note =
    `한 파일에는 최대 ${MAX_SENTENCE_QUESTIONS}문제까지 올릴 수 있습니다. ` +
    `1번째부터 글이 이어지는 정답 순서대로 한 칸에 한 문장씩 입력하세요(${MIN_SENTENCES}~${MAX_SENTENCES}문장).`;

  sheet.addRow([
    "Smartphones have changed how we live.",
    "At first, people used them only for calls.",
    "Soon, apps made them useful for almost everything.",
    "Today, many of us cannot imagine a day without one.",
    "As a result, our habits and our work have changed too.",
  ]);
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sentence-template.xlsx"; filename*=UTF-8''${encodeURIComponent("문장 배열_업로드_양식.xlsx")}`,
      "Cache-Control": "no-store",
    },
  });
}
