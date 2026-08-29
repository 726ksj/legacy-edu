"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface FaqActionState {
  error?: string;
  success?: boolean;
}

function revalidateFaqPaths() {
  revalidatePath("/admin/faqs");
  revalidatePath("/customer-center");
}

export async function createFaq(
  _prevState: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  await requireAdmin();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();

  if (!question || !answer) {
    return { error: "질문과 답변을 입력해주세요." };
  }

  const supabase = createAdminClient();

  const { data: last } = await supabase
    .from("faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("faqs").insert({
    question,
    answer,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateFaqPaths();
  return { success: true };
}

export async function updateFaq(
  id: string,
  formData: FormData,
): Promise<FaqActionState> {
  await requireAdmin();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();

  if (!question || !answer) {
    return { error: "질문과 답변을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("faqs")
    .update({ question, answer })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateFaqPaths();
  return { success: true };
}

export async function deleteFaq(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("faqs").delete().eq("id", id);
  revalidateFaqPaths();
}
