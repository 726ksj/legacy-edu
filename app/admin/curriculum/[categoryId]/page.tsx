import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCategory, updateStep, deleteStep } from "../actions";
import EditCategoryForm from "./EditCategoryForm";
import DeleteCategoryButton from "./DeleteCategoryButton";
import AddStepForm from "./AddStepForm";
import StepRow from "./StepRow";

export const dynamic = "force-dynamic";

interface CategoryTrackRow {
  slug: string;
  title: string;
  curriculum_school_levels: { slug: string; title: string } | null;
}

interface TrackOptionRow {
  id: string;
  slug: string;
  title: string;
  curriculum_school_levels: { slug: string; title: string } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("curriculum_categories")
    .select(
      "id, slug, title, subtitle, intro, closing_title, closing_description, track_id, curriculum_tracks(slug, title, curriculum_school_levels(slug, title))",
    )
    .eq("id", categoryId)
    .maybeSingle<
      {
        id: string;
        slug: string;
        title: string;
        subtitle: string | null;
        intro: string | null;
        closing_title: string | null;
        closing_description: string | null;
        track_id: string | null;
      } & { curriculum_tracks: CategoryTrackRow | null }
    >();

  if (!category) {
    notFound();
  }

  const { data: steps } = await supabase
    .from("curriculum_steps")
    .select("id, icon, title, description")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  const { data: tracks } = await supabase
    .from("curriculum_tracks")
    .select("id, slug, title, curriculum_school_levels(slug, title)")
    .order("sort_order", { ascending: true })
    .returns<TrackOptionRow[]>();

  const publicPath = category.curriculum_tracks
    ? `/curriculum/${category.curriculum_tracks.curriculum_school_levels?.slug}/${category.curriculum_tracks.slug}/${category.slug}`
    : null;

  return (
    <div className="flex flex-1 flex-col p-8">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/curriculum"
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← 커리큘럼 관리
        </Link>
        <DeleteCategoryButton action={deleteCategory.bind(null, categoryId)} />
      </div>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">
        {category.title}
      </h1>
      <p className="mt-1 font-mono text-xs text-zinc-400">
        {publicPath ?? "미배정 (공개 URL 없음 — 홈 화면 노출 예정)"}
      </p>

      <div className="mt-6">
        <EditCategoryForm category={category} tracks={tracks ?? []} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-zinc-900">단계 관리</h2>
      <div className="mt-3">
        <AddStepForm categoryId={categoryId} />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {steps?.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            onUpdate={updateStep.bind(null, step.id, categoryId)}
            onDelete={deleteStep.bind(null, step.id, categoryId)}
          />
        ))}
        {steps?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 단계가 없습니다.</p>
        )}
      </ul>
    </div>
  );
}
