"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CategoryActionState {
  error?: string;
  success?: boolean;
}

// 슬러그는 score_reports.report_type과 연결되는 내부 식별자라 관리자가
// 직접 입력할 필요가 없다. 이름을 영문/숫자로 최대한 살려서 만들고,
// 한글뿐이라 남는 게 없으면 임의 문자열로 대체한다.
function slugify(label: string) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const suffix = randomUUID().slice(0, 8);
  return base ? `${base}_${suffix}` : `category_${suffix}`;
}

function revalidateCategoryPaths() {
  revalidatePath("/admin/score-report-categories");
  revalidatePath("/admin/users/[id]", "layout");
  revalidatePath("/mypage/score-report");
  revalidatePath("/mypage/score-report/[slug]", "layout");
}

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!label) {
    return { error: "이름을 입력해주세요." };
  }

  const supabase = createAdminClient();

  const { data: lastCategory } = await supabase
    .from("score_report_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("score_report_categories").insert({
    label,
    slug: slugify(label),
    description: description || null,
    sort_order: (lastCategory?.sort_order ?? 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCategoryPaths();
  return { success: true };
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<CategoryActionState> {
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!label) {
    return { error: "이름을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("score_report_categories")
    .update({ label, description: description || null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateCategoryPaths();
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient();
  await supabase.from("score_report_categories").delete().eq("id", id);
  revalidateCategoryPaths();
}
