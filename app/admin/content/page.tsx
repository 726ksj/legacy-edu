import { createAdminClient } from "@/lib/supabase/admin";
import SiteContentForm from "./SiteContentForm";
import { CONTENT_DEFAULTS, type SiteContentMap } from "./keys";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("site_content")
    .select("key, value");

  const content: SiteContentMap = { ...CONTENT_DEFAULTS };
  for (const row of rows ?? []) {
    if (row.key in content) {
      content[row.key as keyof SiteContentMap] = row.value;
    }
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/content
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">홈/소개 문구 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        홈 화면 히어로 문구, LEGACY 소개 페이지 본문, 영어 커리큘럼 문구를
        수정하는 페이지입니다.
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
