import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CurriculumCategoryView from "@/components/curriculum/CurriculumCategoryView";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("curriculum_categories")
    .select(
      "id, slug, title, subtitle, intro, closing_title, closing_description",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const { data: steps } = await supabase
    .from("curriculum_steps")
    .select("id, icon, title, description")
    .eq("category_id", category.id)
    .order("sort_order", { ascending: true });

  return (
    <CurriculumCategoryView category={category} steps={steps ?? []} />
  );
}
