"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SiteContentState {
  error?: string;
  success?: boolean;
}

export async function updateSiteContent(
  _prevState: SiteContentState,
  formData: FormData,
): Promise<SiteContentState> {
  const heroHeading = String(formData.get("hero_heading") ?? "").trim();
  const heroSubtitle = String(formData.get("hero_subtitle") ?? "").trim();
  const aboutBody = String(formData.get("about_body") ?? "").trim();

  if (!heroHeading || !heroSubtitle || !aboutBody) {
    return { error: "모든 항목을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_content").upsert([
    { key: "hero_heading", value: heroHeading },
    { key: "hero_subtitle", value: heroSubtitle },
    { key: "about_body", value: aboutBody },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/about");
  return { success: true };
}
