"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

const IMAGE_BUCKET = "popup-images";

export interface PopupFormState {
  error?: string;
  success?: boolean;
}

async function uploadImage(
  supabase: ReturnType<typeof createAdminClient>,
  file: File,
) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (error) {
    throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  return publicUrl;
}

function readPopupFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!title) {
    return { error: "제목을 입력해주세요." } as const;
  }

  return {
    fields: {
      title,
      body: body || null,
      link_url: linkUrl || null,
      is_active: isActive,
    },
  } as const;
}

function revalidatePopupPaths(id?: string) {
  revalidatePath("/admin/popups");
  revalidatePath("/");
  if (id) {
    revalidatePath(`/admin/popups/${id}`);
  }
}

export async function createPopup(
  _prevState: PopupFormState,
  formData: FormData,
): Promise<PopupFormState> {
  await requireAdmin();
  const parsed = readPopupFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const image = formData.get("image");
  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = await uploadImage(supabase, image);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
      };
    }
  }

  const { error } = await supabase
    .from("popups")
    .insert({ ...parsed.fields, image_url: imageUrl });

  if (error) {
    return { error: error.message };
  }

  revalidatePopupPaths();
  return { success: true };
}

export async function updatePopup(
  id: string,
  _prevState: PopupFormState,
  formData: FormData,
): Promise<PopupFormState> {
  await requireAdmin();
  const parsed = readPopupFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = createAdminClient();
  const update: Record<string, unknown> = { ...parsed.fields };

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    try {
      update.image_url = await uploadImage(supabase, image);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
      };
    }
  }

  const { error } = await supabase.from("popups").update(update).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePopupPaths(id);
  return { success: true };
}

export async function deletePopup(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("popups").delete().eq("id", id);
  revalidatePopupPaths();
}

export async function deletePopupAndRedirect(id: string) {
  await deletePopup(id);
  redirect("/admin/popups");
}
