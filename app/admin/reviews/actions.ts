"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface ReviewFormState {
  error?: string;
  success?: boolean;
}

function readReviewFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!name || !school || !subject || !summary || !detail) {
    return { error: "모든 항목을 입력해주세요." } as const;
  }

  return { fields: { name, school, subject, summary, detail } } as const;
}

export async function createReview(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  await requireAdmin();
  const parsed = readReviewFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("reviews").insert(parsed.fields);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return { success: true };
}

export async function updateReview(
  id: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  await requireAdmin();
  const parsed = readReviewFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteReview(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("reviews").delete().eq("id", id);
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}

export async function deleteReviewAndRedirect(id: string) {
  await deleteReview(id);
  redirect("/admin/reviews");
}
