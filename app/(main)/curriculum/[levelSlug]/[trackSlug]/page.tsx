import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ levelSlug: string; trackSlug: string }>;
}) {
  const { levelSlug, trackSlug } = await params;
  const supabase = await createClient();

  const { data: level } = await supabase
    .from("curriculum_school_levels")
    .select("id, slug, title")
    .eq("slug", levelSlug)
    .maybeSingle();

  if (!level) {
    notFound();
  }

  const { data: track } = await supabase
    .from("curriculum_tracks")
    .select("id, slug, title")
    .eq("school_level_id", level.id)
    .eq("slug", trackSlug)
    .maybeSingle();

  if (!track) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("curriculum_categories")
    .select("slug, title, subtitle")
    .eq("track_id", track.id)
    .order("sort_order", { ascending: true });

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Curriculum
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {track.title}
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
      </div>

      <div className="flex flex-col gap-3">
        {categories?.map((category) => (
          <Link
            key={category.slug}
            href={`/curriculum/${level.slug}/${track.slug}/${category.slug}`}
            className="flex min-h-20 flex-col justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-6 py-4 transition-colors hover:border-brand/50"
          >
            <p className="text-base font-bold text-zinc-900">
              {category.title}
            </p>
            {category.subtitle && (
              <p className="text-sm text-zinc-500">{category.subtitle}</p>
            )}
          </Link>
        ))}
        {categories?.length === 0 && (
          <p className="text-sm text-zinc-400">
            등록된 커리큘럼이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
