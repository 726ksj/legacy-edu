"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ConsultationState {
  error?: string;
  success?: boolean;
}

export async function submitConsultation(
  _prevState: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const role = String(formData.get("role") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const mockGrade = String(formData.get("mockGrade") ?? "").trim();
  const schoolExamGrade = String(formData.get("schoolExamGrade") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!role || !school || !grade || !phone || !message) {
    return { error: "필수 항목을 모두 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("consultation_requests").insert({
    role,
    school,
    grade,
    phone,
    subject: "영어",
    mock_grade: mockGrade || null,
    school_exam_grade: schoolExamGrade || null,
    message,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
