"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deletePasswordResetRequest(id: string) {
  const supabase = createAdminClient();
  await supabase.from("password_reset_requests").delete().eq("id", id);
  revalidatePath("/admin/password-reset-requests");
}
