"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { getPaidProfileIds, isAdminUsername } from "@/lib/courseStudents";

// 한 번에 추가할 수 있는 학생 수. 화면에서 전체 선택을 눌러도 넘지 않는 선으로 둔다.
const MAX_ADD_AT_ONCE = 500;

export interface AddStudentsState {
  error?: string;
  success?: boolean;
  message?: string;
}

function revalidateCoursePages(courseId: string) {
  revalidatePath(`/mypage/teaching/${courseId}`, "layout");
}

// 강사가 자기 강좌에 학생을 직접 등록한다. 클라이언트가 보낸 id라서 서버에서 다시
// 걸러낸다: 학생 계정(role = student)만, 관리자 아이디는 제외, 이미 등록된 학생은 건너뛴다.
export async function addCourseStudents(
  courseId: string,
  _prevState: AddStudentsState,
  formData: FormData,
): Promise<AddStudentsState> {
  await requireCourseManager(courseId);

  const requested = [...new Set(formData.getAll("profileIds").map(String).filter(Boolean))];
  if (requested.length === 0) {
    return { error: "추가할 학생을 선택해주세요." };
  }
  if (requested.length > MAX_ADD_AT_ONCE) {
    return { error: `한 번에 ${MAX_ADD_AT_ONCE}명까지 추가할 수 있습니다.` };
  }

  const supabase = createAdminClient();

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, role")
    .in("id", requested);
  if (profileError) {
    return { error: `학생 정보를 불러오지 못했습니다: ${profileError.message}` };
  }

  const validIds = (profiles ?? [])
    .filter((profile) => profile.role === "student" && !isAdminUsername(profile.username))
    .map((profile) => profile.id as string);
  const skippedInvalid = requested.length - validIds.length;

  const { data: existing } = await supabase
    .from("enrollments")
    .select("profile_id")
    .eq("course_id", courseId)
    .in("profile_id", validIds.length > 0 ? validIds : [courseId]);
  const alreadyEnrolled = new Set((existing ?? []).map((row) => row.profile_id as string));
  const toAdd = validIds.filter((id) => !alreadyEnrolled.has(id));

  if (toAdd.length === 0) {
    return {
      error:
        alreadyEnrolled.size > 0
          ? "선택한 학생은 이미 모두 이 강좌에 등록되어 있습니다."
          : "등록할 수 있는 학생이 없습니다.",
    };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert(toAdd.map((profileId) => ({ profile_id: profileId, course_id: courseId })));
  if (error && error.code !== "23505") {
    return { error: `수강생 등록 중 오류가 발생했습니다: ${error.message}` };
  }

  revalidateCoursePages(courseId);

  const notes = [
    alreadyEnrolled.size > 0 && `이미 등록되어 있던 ${alreadyEnrolled.size}명 제외`,
    skippedInvalid > 0 && `등록할 수 없는 계정 ${skippedInvalid}명 제외`,
  ].filter(Boolean);
  return {
    success: true,
    message: `${toAdd.length}명 등록 완료${notes.length > 0 ? ` (${notes.join(", ")})` : ""}`,
  };
}

// 강좌에서 학생을 뺀다(수강 권한 해지). 결제로 등록된 학생은 강사가 직접 해지할 수
// 없다. 수강 권한과 함께 그 강좌 차시에 남긴 질문(메모)도 지운다(관리자 화면과 동일).
export async function removeCourseStudent(
  enrollmentId: string,
  courseId: string,
): Promise<{ error?: string }> {
  await requireCourseManager(courseId);
  const supabase = createAdminClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, profile_id")
    .eq("id", enrollmentId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enrollment) {
    return { error: "이 강좌의 수강생이 아닙니다." };
  }

  const paid = await getPaidProfileIds(supabase, courseId);
  if (paid.has(enrollment.profile_id as string)) {
    return { error: "결제로 등록된 수강생은 직접 해지할 수 없습니다. 관리자에게 문의해주세요." };
  }

  const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
  if (error) {
    return { error: `수강 해지 중 오류가 발생했습니다: ${error.message}` };
  }

  const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", courseId);
  const lessonIds = (lessons ?? []).map((lesson) => lesson.id as string);
  if (lessonIds.length > 0) {
    await supabase
      .from("questions")
      .delete()
      .eq("profile_id", enrollment.profile_id)
      .in("lesson_id", lessonIds);
  }

  revalidateCoursePages(courseId);
  return {};
}
