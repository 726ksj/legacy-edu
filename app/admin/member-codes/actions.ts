"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface CreateMemberCodeState {
  error?: string;
  success?: boolean;
}

export async function createMemberCode(
  _prevState: CreateMemberCodeState,
  formData: FormData,
): Promise<CreateMemberCodeState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "").trim();
  const memberName = String(formData.get("memberName") ?? "").trim();
  const role = String(formData.get("role") ?? "student").trim();

  if (!code || !memberName) {
    return { error: "코드와 회원 이름을 입력해주세요." };
  }
  if (role !== "student" && role !== "teacher" && role !== "assistant") {
    return { error: "역할을 다시 선택해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("member_codes")
    .insert({ code, member_name: memberName, role, issued_by: "admin" });

  if (error) {
    return {
      error: error.code === "23505" ? "이미 존재하는 코드입니다." : error.message,
    };
  }

  revalidatePath("/admin/member-codes");
  return { success: true };
}

export interface DeleteMemberCodeState {
  error?: string;
}

export async function deleteMemberCode(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: DeleteMemberCodeState,
): Promise<DeleteMemberCodeState> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("member_code_id", id)
    .maybeSingle();

  if (profile) {
    // auth 유저 삭제 시 profiles 행도 on delete cascade로 함께 삭제되고,
    // (선생님이었다면) course_teachers 배정도 profile_id의 cascade로
    // 함께 삭제된다.
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      profile.id,
    );

    if (deleteUserError) {
      return { error: `계정 삭제에 실패했습니다: ${deleteUserError.message}` };
    }
  }

  const { error } = await supabase.from("member_codes").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/member-codes");
  return {};
}
