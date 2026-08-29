"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export async function markInquiryComplete(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("inquiries").update({ status: "completed" }).eq("id", id);
  revalidatePath("/admin/inquiries");
}

export async function deleteInquiry(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/inquiries");
}
