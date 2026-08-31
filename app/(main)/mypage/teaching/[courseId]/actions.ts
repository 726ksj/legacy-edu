"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";

export interface CourseNoticeActionState {
  error?: string;
  success?: boolean;
}

function revalidateCourseNoticePaths(courseId: string) {
  revalidatePath(`/mypage/teaching/${courseId}`);
  revalidatePath(`/my-classroom/${courseId}`);
}

export async function createCourseNotice(
  courseId: string,
  _prevState: CourseNoticeActionState,
  formData: FormData,
): Promise<CourseNoticeActionState> {
  await requireCourseManager(courseId);
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("course_notices")
    .insert({ course_id: courseId, title, content });

  if (error) {
    return { error: error.message };
  }

  revalidateCourseNoticePaths(courseId);
  return { success: true };
}

export async function updateCourseNotice(
  id: string,
  courseId: string,
  formData: FormData,
): Promise<CourseNoticeActionState> {
  await requireCourseManager(courseId);
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("course_notices")
    .update({ title, content })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateCourseNoticePaths(courseId);
  return { success: true };
}

export async function deleteCourseNotice(id: string, courseId: string) {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();
  await supabase.from("course_notices").delete().eq("id", id);
  revalidateCourseNoticePaths(courseId);
}
