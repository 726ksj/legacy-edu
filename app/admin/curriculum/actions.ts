"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

function revalidateCurriculumPaths() {
  revalidatePath("/admin/curriculum");
  revalidatePath(`/admin/curriculum/[categoryId]`, "page");
  // 카테고리가 어느 학교급/트랙에 속하는지에 따라 공개 URL이 달라지고
  // 트랙 재배정도 가능하므로, 개별 경로 대신 /curriculum 하위 전체를
  // 무효화한다.
  revalidatePath("/curriculum", "layout");
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export interface CategoryActionState {
  error?: string;
  success?: boolean;
}

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const title = readTrimmed(formData, "title");
  const slug = readTrimmed(formData, "slug");
  const subtitle = readTrimmed(formData, "subtitle");
  const intro = readTrimmed(formData, "intro");
  const closingTitle = readTrimmed(formData, "closingTitle");
  const closingDescription = readTrimmed(formData, "closingDescription");
  const trackId = readTrimmed(formData, "trackId");

  if (!title || !slug) {
    return { error: "제목과 슬러그를 입력해주세요." };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      error: "슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.",
    };
  }

  const supabase = createAdminClient();

  const { data: last } = await supabase
    .from("curriculum_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("curriculum_categories").insert({
    title,
    slug,
    subtitle: subtitle || null,
    intro: intro || null,
    closing_title: closingTitle || null,
    closing_description: closingDescription || null,
    track_id: trackId || null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "이미 사용 중인 슬러그입니다." : error.message,
    };
  }

  revalidateCurriculumPaths();
  return { success: true };
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const title = readTrimmed(formData, "title");
  const slug = readTrimmed(formData, "slug");
  const subtitle = readTrimmed(formData, "subtitle");
  const intro = readTrimmed(formData, "intro");
  const closingTitle = readTrimmed(formData, "closingTitle");
  const closingDescription = readTrimmed(formData, "closingDescription");
  const trackId = readTrimmed(formData, "trackId");

  if (!title || !slug) {
    return { error: "제목과 슬러그를 입력해주세요." };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      error: "슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("curriculum_categories")
    .update({
      title,
      slug,
      subtitle: subtitle || null,
      intro: intro || null,
      closing_title: closingTitle || null,
      closing_description: closingDescription || null,
      track_id: trackId || null,
    })
    .eq("id", id);

  if (error) {
    return {
      error: error.code === "23505" ? "이미 사용 중인 슬러그입니다." : error.message,
    };
  }

  revalidateCurriculumPaths();
  return { success: true };
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("curriculum_categories").delete().eq("id", id);
  revalidateCurriculumPaths();
}

async function assertStepInCategory(
  supabase: ReturnType<typeof createAdminClient>,
  stepId: string,
  categoryId: string,
) {
  const { data } = await supabase
    .from("curriculum_steps")
    .select("id")
    .eq("id", stepId)
    .eq("category_id", categoryId)
    .maybeSingle();

  if (!data) {
    throw new Error("이 커리큘럼의 단계가 아닙니다.");
  }
}

export interface StepActionState {
  error?: string;
  success?: boolean;
}

export async function createStep(
  categoryId: string,
  _prevState: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  await requireAdmin();
  const icon = readTrimmed(formData, "icon");
  const title = readTrimmed(formData, "title");
  const description = readTrimmed(formData, "description");

  if (!icon || !title) {
    return { error: "아이콘과 제목을 입력해주세요." };
  }

  const supabase = createAdminClient();

  const { data: last } = await supabase
    .from("curriculum_steps")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("curriculum_steps").insert({
    category_id: categoryId,
    icon,
    title,
    description: description || null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCurriculumPaths();
  return { success: true };
}

export async function updateStep(
  stepId: string,
  categoryId: string,
  formData: FormData,
): Promise<StepActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  await assertStepInCategory(supabase, stepId, categoryId);

  const icon = readTrimmed(formData, "icon");
  const title = readTrimmed(formData, "title");
  const description = readTrimmed(formData, "description");

  if (!icon || !title) {
    return { error: "아이콘과 제목을 입력해주세요." };
  }

  const { error } = await supabase
    .from("curriculum_steps")
    .update({ icon, title, description: description || null })
    .eq("id", stepId);

  if (error) {
    return { error: error.message };
  }

  revalidateCurriculumPaths();
  return { success: true };
}

export async function deleteStep(stepId: string, categoryId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await assertStepInCategory(supabase, stepId, categoryId);
  await supabase.from("curriculum_steps").delete().eq("id", stepId);
  revalidateCurriculumPaths();
}
