"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteQuestion(id: string) {
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", id);
  revalidatePath("/my-qna");
}
