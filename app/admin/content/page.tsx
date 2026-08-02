import { createAdminClient } from "@/lib/supabase/admin";
import SiteContentForm from "./SiteContentForm";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  hero_heading: "고등 내신 & 수능 전문",
  hero_subtitle:
    "내신 전교 1등 maker! 압도적인 강의력, 꼼꼼한 관리로 학생 한 명 한 명의 배움의 자산(legacy)을 함께 만들어갑니다.",
  about_body: "",
};

export default async function Page() {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("site_content")
    .select("key, value");

  const content = { ...DEFAULTS };
  for (const row of rows ?? []) {
    if (row.key in content) {
      content[row.key as keyof typeof DEFAULTS] = row.value;
    }
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/content
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">홈/소개 문구 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        홈 화면 히어로 문구와 LEGACY 소개 페이지 본문을 수정하는 페이지입니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          내용을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 max-w-2xl">
        <SiteContentForm content={content} />
      </div>
    </div>
  );
}
