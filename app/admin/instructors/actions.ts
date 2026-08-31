"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

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
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photo = formData.get("photo");
  const profileId = String(formData.get("profileId") ?? "").trim() || null;

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
    profile_id: profileId,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "이미 다른 강사 카드와 연결된 계정입니다."
          : error.message,
    };
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
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photo = formData.get("photo");
  const profileId = String(formData.get("profileId") ?? "").trim() || null;

  if (!name || !subject) {
    return { error: "강사 이름과 과목을 입력해주세요." };
  }

  const supabase = createAdminClient();

  const update: {
    name: string;
    subject: string;
    bio: string | null;
    profile_id: string | null;
    photo_url?: string;
  } = {
    name,
    subject,
    bio: bio || null,
    profile_id: profileId,
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
    return {
      error:
        error.code === "23505"
          ? "이미 다른 강사 카드와 연결된 계정입니다."
          : error.message,
    };
  }

  revalidatePath("/admin/instructors");
  revalidatePath(`/admin/instructors/${id}`);
  revalidatePath("/admin/courses");
  return { success: true };
}

export interface DeleteInstructorState {
  error?: string;
}

export async function deleteInstructor(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: DeleteInstructorState,
): Promise<DeleteInstructorState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("instructors").delete().eq("id", id);

  if (error) {
    return {
      error: error.message.includes("foreign key")
        ? "이 강사를 사용 중인 강좌가 있어 삭제할 수 없습니다. 먼저 해당 강좌의 강사를 변경해주세요."
        : error.message,
    };
  }

  revalidatePath("/admin/instructors");
  revalidatePath("/admin/courses");
  redirect("/admin/instructors");
}
