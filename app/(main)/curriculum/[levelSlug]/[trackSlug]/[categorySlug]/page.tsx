import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CurriculumCategoryView from "@/components/curriculum/CurriculumCategoryView";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ levelSlug: string; trackSlug: string; categorySlug: string }>;
}) {
  const { levelSlug, trackSlug, categorySlug } = await params;
  const supabase = await createClient();

  const { data: track } = await supabase
    .from("curriculum_tracks")
    .select("id, curriculum_school_levels!inner(slug)")
    .eq("slug", trackSlug)
    .eq("curriculum_school_levels.slug", levelSlug)
    .maybeSingle();

  if (!track) {
    notFound();
  }

  const { data: category } = await supabase
    .from("curriculum_categories")
    .select(
      "id, slug, title, subtitle, intro, closing_title, closing_description",
    )
    .eq("slug", categorySlug)
    .eq("track_id", track.id)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const { data: steps } = await supabase
    .from("curriculum_steps")
    .select("id, icon, title, description")
    .eq("category_id", category.id)
    .order("sort_order", { ascending: true });

  return <CurriculumCategoryView category={category} steps={steps ?? []} />;
}
