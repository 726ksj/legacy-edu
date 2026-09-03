"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/email";
import { isProtectedAdminAccount } from "@/lib/adminProtection";
import type { StaffRole } from "@/lib/staffAccounts";

const BASE_PATH: Record<StaffRole, string> = {
  teacher: "/admin/teacher-accounts",
  assistant: "/admin/assistant-accounts",
};

export interface UpdateStaffAccountState {
  error?: string;
  success?: boolean;
}

export async function updateStaffAccount(
  role: StaffRole,
  id: string,
  _prevState: UpdateStaffAccountState,
  formData: FormData,
): Promise<UpdateStaffAccountState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name || !phone || !email) {
    return { error: "이름, 전화번호, 이메일은 비워둘 수 없습니다." };
  }
  if (!isValidEmail(email)) {
    return { error: "이메일 형식이 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  // role까지 같이 걸어서, 이 화면에서 다른 역할 계정을 잘못 수정하지
  // 못하게 한다.
  const { error } = await supabase
    .from("profiles")
    .update({ name, phone, email })
    .eq("id", id)
    .eq("role", role);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(BASE_PATH[role]);
  revalidatePath(`${BASE_PATH[role]}/${id}`);
  return { success: true };
}

export async function removeStaffDevice(
  role: StaffRole,
  userId: string,
  deviceRowId: string,
) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase
    .from("user_devices")
    .delete()
    .eq("id", deviceRowId)
    .eq("user_id", userId);

  revalidatePath(`${BASE_PATH[role]}/${userId}`);
}

export interface DeleteStaffAccountState {
  error?: string;
}

export async function deleteStaffAccount(
  role: StaffRole,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: DeleteStaffAccountState,
): Promise<DeleteStaffAccountState> {
  await requireAdmin();
  const supabase = createAdminClient();

  // 이 화면에서 다른 역할 계정을 잘못 삭제하지 못하도록 role을 먼저 확인한다.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("role", role)
    .maybeSingle();

  if (!profile) {
    return { error: "대상을 찾을 수 없습니다." };
  }
  if (await isProtectedAdminAccount(id)) {
    return { error: "관리자 계정은 이 화면에서 삭제할 수 없습니다." };
  }

  // auth 유저 삭제 시 profiles 행(및 course_teachers 배정, 연결된 강사
  // 카드)도 on delete cascade로 함께 삭제됨.
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(BASE_PATH[role]);
  redirect(BASE_PATH[role]);
}
