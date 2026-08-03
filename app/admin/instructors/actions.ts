"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export interface InstructorFormState {
  error?: string;
  success?: boolean;
}

function readInstructorFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!name) {
    return { error: "강사 이름을 입력해주세요." } as const;
  }

  return {
    fields: {
      name,
      photo_url: photoUrl || null,
      bio: bio || null,
    },
  } as const;
}

export async function createInstructor(
  _prevState: InstructorFormState,
  formData: FormData,
): Promise<InstructorFormState> {
  const parsed = readInstructorFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("instructors").insert(parsed.fields);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/instructors");
  revalidatePath("/admin/courses");
  return { success: true };
}

export async function updateInstructor(
  id: string,
  _prevState: InstructorFormState,
  formData: FormData,
): Promise<InstructorFormState> {
  const parsed = readInstructorFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("instructors")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/instructors");
  revalidatePath(`/admin/instructors/${id}`);
  revalidatePath("/admin/courses");
  return { success: true };
}

export async function deleteInstructor(id: string) {
  const supabase = createAdminClient();
  await supabase.from("instructors").delete().eq("id", id);
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/courses");
}

export async function deleteInstructorAndRedirect(id: string) {
  await deleteInstructor(id);
  redirect("/admin/instructors");
}
