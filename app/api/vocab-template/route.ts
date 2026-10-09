import ExcelJS from "exceljs";
import { getAuthUser } from "@/lib/supabase/server";
import { REQUIRED_VOCAB_HEADERS } from "@/lib/vocabUpload";

export const dynamic = "force-dynamic";

// 단어장 업로드용 엑셀 양식. 헤더 3개(단어, 뜻, 예시 문장)와 예시 몇 줄만
// 들어 있고, 강사는 예시 줄을 지우고 자기 단어를 채워 올리면 된다.
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("단어장");

  sheet.columns = REQUIRED_VOCAB_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "예시 문장" ? 60 : 24,
  }));
  sheet.getRow(1).font = { bold: true };

  sheet.addRows([
    ["abandon", "버리다, 포기하다", "He had to abandon his plan."],
    ["resilient", "회복력 있는", "Children are often more resilient than adults."],
    ["scarce", "부족한, 드문", "Water is scarce in the desert."],
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vocab-template.xlsx"; filename*=UTF-8''${encodeURIComponent("단어장_업로드_양식.xlsx")}`,
      "Cache-Control": "no-store",
    },
  });
}
