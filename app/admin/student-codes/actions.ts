"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateStudentCodeState {
  error?: string;
  success?: boolean;
}

export async function createStudentCode(
  _prevState: CreateStudentCodeState,
  formData: FormData,
): Promise<CreateStudentCodeState> {
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

export async function deleteStudentCode(id: string) {
  const supabase = createAdminClient();
  // 이미 사용된 코드는 profiles에서 참조 중이라 삭제하지 않음 (FK 제약과 별개로 명시적으로 막음)
  await supabase.from("student_codes").delete().eq("id", id).eq("is_used", false);
  revalidatePath("/admin/student-codes");
}
