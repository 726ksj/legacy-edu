"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpdateUserState {
  error?: string;
  success?: boolean;
}

export async function updateUser(
  id: string,
  _prevState: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();

  if (!name || !phone || !address) {
    return { error: "이름, 전화번호, 주소는 비워둘 수 없습니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      phone,
      guardian_phone: guardianPhone || null,
      address,
      school: school || null,
      grade: grade || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { success: true };
}

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
}

export async function resetUserPassword(
  id: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export interface DeleteUserState {
  error?: string;
}

export async function deleteUser(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: DeleteUserState,
): Promise<DeleteUserState> {
  const supabase = createAdminClient();
  // auth 유저 삭제 시 profiles 행(및 enrollments)도 on delete cascade로 함께 삭제됨
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
