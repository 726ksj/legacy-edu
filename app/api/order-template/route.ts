import ExcelJS from "exceljs";
import { getAuthUser } from "@/lib/supabase/server";
import { ORDER_HEADERS, MAX_ORDER_QUESTIONS } from "@/lib/orderUpload";

export const dynamic = "force-dynamic";

// 순서 배열 문제 업로드용 엑셀 양식. 한 행이 한 문제이고, 첫 문장 뒤에 이어지는
// 세 덩어리를 정답 순서대로 1번째·2번째·3번째 열에 입력한다.
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("순서 배열");

  sheet.columns = ORDER_HEADERS.map((header) => ({ header, key: header, width: 48 }));
  sheet.getRow(1).font = { bold: true };
  // 첫 열 제목에 메모로 입력 방법을 안내한다(셀 값이 아니라 업로드 읽기에는 영향이 없다).
  sheet.getCell("A1").note = `한 파일에는 최대 ${MAX_ORDER_QUESTIONS}문제까지 올릴 수 있습니다. 1번째~3번째 열에는 글이 이어지는 정답 순서대로 입력하세요.`;

  sheet.addRow([
    "Smartphones have changed how we live.",
    "At first, people used them only for calls.",
    "Soon, apps made them useful for almost everything.",
    "Today, many of us cannot imagine a day without one.",
  ]);
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="order-template.xlsx"; filename*=UTF-8''${encodeURIComponent("순서 배열_업로드_양식.xlsx")}`,
      "Cache-Control": "no-store",
    },
  });
}
