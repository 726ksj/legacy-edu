"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AddManyToCartResult {
  error?: string;
}

export async function addManyToCart(
  courseIds: string[],
): Promise<AddManyToCartResult> {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/courses/high")}`);
  }

  if (courseIds.length === 0) {
    return {};
  }

  const supabase = createAdminClient();

  const { data: existingEnrollments } = await supabase
    .from("enrollments")
    .select("courses(title)")
    .eq("profile_id", user.id)
    .in("course_id", courseIds)
    .returns<{ courses: { title: string } | null }[]>();

  if (existingEnrollments && existingEnrollments.length > 0) {
    const titles = existingEnrollments
      .map((row) => row.courses?.title)
      .filter(Boolean)
      .join(", ");
    return {
      error: `이미 수강 중인 강좌예요: ${titles}`,
    };
  }

  const { data: existing } = await supabase
    .from("cart_items")
    .select("courses(title)")
    .eq("profile_id", user.id)
    .in("course_id", courseIds)
    .returns<{ courses: { title: string } | null }[]>();

  if (existing && existing.length > 0) {
    const titles = existing
      .map((row) => row.courses?.title)
      .filter(Boolean)
      .join(", ");
    return {
      error: `이미 장바구니에 담긴 강좌예요: ${titles}`,
    };
  }

  const { error } = await supabase.from("cart_items").insert(
    courseIds.map((courseId) => ({ profile_id: user.id, course_id: courseId })),
  );

  if (error) {
    return { error: "장바구니 담기에 실패했습니다." };
  }

  revalidatePath("/mypage/cart");
  redirect("/mypage/cart");
}

export async function removeFromCart(cartItemId: string) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = createAdminClient();
  await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("profile_id", user.id);

  revalidatePath("/mypage/cart");
}
