import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_DEFAULTS, type SiteContentMap } from "@/app/admin/content/keys";

export default async function Footer() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("site_content")
    .select("key, value");

  const content: SiteContentMap = { ...CONTENT_DEFAULTS };
  for (const row of rows ?? []) {
    if (row.key in content) {
      content[row.key as keyof SiteContentMap] = row.value;
    }
  }

  return (
    <footer className="w-full border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pb-12">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-bold text-brand-dark">LEGACY EDU</p>
            <p className="mt-2 text-sm text-zinc-500">
              고등학생 내신 및 수능 전문 교육
            </p>
            <div className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-400">
              <p>
                {content.business_name} · 대표 {content.representative_name}
              </p>
              <p>사업자등록번호 {content.business_registration_number}</p>
              <p>{content.business_address}</p>
              <p>{content.business_phone}</p>
            </div>
          </div>

          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-zinc-700">바로가기</span>
              <Link href="/about/greeting" className="text-zinc-500 hover:text-brand-dark">
                LEGACY 소개
              </Link>
              <Link href="/notice" className="text-zinc-500 hover:text-brand-dark">
                NOTICE
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-zinc-700">고객지원</span>
              <Link href="/customer-center" className="text-zinc-500 hover:text-brand-dark">
                고객센터 / FAQ
              </Link>
              <Link href="/signup" className="text-zinc-500 hover:text-brand-dark">
                회원가입
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-zinc-400">
          © {new Date().getFullYear()} LEGACY EDU. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
