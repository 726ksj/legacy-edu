"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export interface CreateStudentCodeState {
  error?: string;
  success?: boolean;
}

export async function createStudentCode(
  _prevState: CreateStudentCodeState,
  formData: FormData,
): Promise<CreateStudentCodeState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "").trim();
  const studentName = String(formData.get("studentName") ?? "").trim();

  if (!code || !studentName) {
    return { error: "코드와 학생 이름을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("student_codes")
    .insert({ code, student_name: studentName, issued_by: "admin" });

  if (error) {
    return {
      error:
        error.code === "23505" ? "이미 존재하는 코드입니다." : error.message,
    };
  }

  revalidatePath("/admin/student-codes");
  return { success: true };
}

export interface DeleteStudentCodeState {
  error?: string;
}

export async function deleteStudentCode(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: DeleteStudentCodeState,
): Promise<DeleteStudentCodeState> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("student_code_id", id)
    .maybeSingle();

  if (profile) {
    // auth 유저 삭제 시 profiles 행도 on delete cascade로 함께 삭제됨
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      profile.id,
    );

    if (deleteUserError) {
      return { error: `학생 계정 삭제에 실패했습니다: ${deleteUserError.message}` };
    }
  }

  const { error } = await supabase.from("student_codes").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/student-codes");
  return {};
}
