"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateStructurePaths() {
  revalidatePath("/admin/curriculum/structure");
  revalidatePath("/admin/curriculum");
  revalidatePath("/curriculum", "layout");
}

export interface StructureActionState {
  error?: string;
  success?: boolean;
}

export async function createSchoolLevel(
  _prevState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  await requireAdmin();
  const title = readTrimmed(formData, "title");
  const slug = readTrimmed(formData, "slug");

  if (!title || !slug) {
    return { error: "이름과 슬러그를 입력해주세요." };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다." };
  }

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("curriculum_school_levels")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("curriculum_school_levels").insert({
    title,
    slug,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "이미 사용 중인 슬러그입니다." : error.message,
    };
  }

  revalidateStructurePaths();
  return { success: true };
}

export async function deleteSchoolLevel(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("curriculum_school_levels").delete().eq("id", id);
  revalidateStructurePaths();
}

export async function createTrack(
  schoolLevelId: string,
  _prevState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  await requireAdmin();
  const title = readTrimmed(formData, "title");
  const slug = readTrimmed(formData, "slug");

  if (!title || !slug) {
    return { error: "이름과 슬러그를 입력해주세요." };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다." };
  }

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("curriculum_tracks")
    .select("sort_order")
    .eq("school_level_id", schoolLevelId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("curriculum_tracks").insert({
    school_level_id: schoolLevelId,
    title,
    slug,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "이 학교급에 이미 사용 중인 슬러그입니다."
          : error.message,
    };
  }

  revalidateStructurePaths();
  return { success: true };
}

export async function deleteTrack(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("curriculum_tracks").delete().eq("id", id);
  revalidateStructurePaths();
}
