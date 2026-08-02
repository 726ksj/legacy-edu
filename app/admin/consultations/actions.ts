"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markConsultationComplete(id: string) {
  const supabase = createAdminClient();
  await supabase
    .from("consultation_requests")
    .update({ status: "completed" })
    .eq("id", id);
  revalidatePath("/admin/consultations");
}

export async function deleteConsultation(id: string) {
  const supabase = createAdminClient();
  await supabase.from("consultation_requests").delete().eq("id", id);
  revalidatePath("/admin/consultations");
}
