import ExcelJS from "exceljs";
import { getAuthUser } from "@/lib/supabase/server";
import { REQUIRED_WRITING_HEADERS, OPTIONAL_WRITING_HEADERS } from "@/lib/writingUpload";

export const dynamic = "force-dynamic";

// 서술형 문장 업로드용 엑셀 양식. 영어 문장/우리말은 필수이고, 배열 단위와 핵심
// 어구는 선택이다(배열 단위를 비우면 단어 단위로 자동 분할, 항목은 "/"로 구분).
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("서술형");

  const headers = [...REQUIRED_WRITING_HEADERS, ...OPTIONAL_WRITING_HEADERS];
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: header === "영어 문장" || header === "우리말" ? 42 : 36,
  }));
  sheet.getRow(1).font = { bold: true };

  sheet.addRows([
    [
      "I eat an apple every morning.",
      "나는 매일 아침 사과를 먹는다.",
      "I eat / an apple / every morning.",
      "an apple",
    ],
    ["She studies at the library.", "그녀는 도서관에서 공부한다.", "", ""],
    [
      "The experiment demonstrated the theory.",
      "그 실험은 그 이론을 입증했다.",
      "The experiment / demonstrated / the theory.",
      "demonstrated",
    ],
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="writing-template.xlsx"; filename*=UTF-8''${encodeURIComponent("서술형_업로드_양식.xlsx")}`,
      "Cache-Control": "no-store",
    },
  });
}
