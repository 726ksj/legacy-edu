"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { CONTENT_KEYS } from "./keys";

export interface SiteContentState {
  error?: string;
  success?: boolean;
}

export async function updateSiteContent(
  _prevState: SiteContentState,
  formData: FormData,
): Promise<SiteContentState> {
  await requireAdmin();
  const rows = CONTENT_KEYS.map((key) => ({
    key,
    value: String(formData.get(key) ?? "").trim(),
  }));

  if (rows.some((row) => !row.value)) {
    return { error: "모든 항목을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_content").upsert(rows);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/content");
  // 사업자 정보(푸터)는 거의 모든 페이지에 노출되므로 사이트 전체를
  // 다시 검증한다.
  revalidatePath("/", "layout");
  return { success: true };
}
