"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const PHOTO_BUCKET = "instructor-photos";

export interface InstructorFormState {
  error?: string;
  success?: boolean;
}

async function uploadPhoto(
  supabase: ReturnType<typeof createAdminClient>,
  file: File,
) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (error) {
    throw new Error(`사진 업로드에 실패했습니다: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function createInstructor(
  _prevState: InstructorFormState,
  formData: FormData,
): Promise<InstructorFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photo = formData.get("photo");

  if (!name || !subject) {
    return { error: "강사 이름과 과목을 입력해주세요." };
  }

  const supabase = createAdminClient();

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await uploadPhoto(supabase, photo);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "사진 업로드에 실패했습니다." };
    }
  }

  const { error } = await supabase.from("instructors").insert({
    name,
    subject,
    photo_url: photoUrl,
    bio: bio || null,
  });

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
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photo = formData.get("photo");

  if (!name || !subject) {
    return { error: "강사 이름과 과목을 입력해주세요." };
  }

  const supabase = createAdminClient();

  const update: {
    name: string;
    subject: string;
    bio: string | null;
    photo_url?: string;
  } = {
    name,
    subject,
    bio: bio || null,
  };

  if (photo instanceof File && photo.size > 0) {
    try {
      update.photo_url = await uploadPhoto(supabase, photo);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "사진 업로드에 실패했습니다." };
    }
  }

  const { error } = await supabase
    .from("instructors")
    .update(update)
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
