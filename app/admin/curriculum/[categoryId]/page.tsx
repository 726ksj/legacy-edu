import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCategory, updateStep, deleteStep } from "../actions";
import EditCategoryForm from "./EditCategoryForm";
import DeleteCategoryButton from "./DeleteCategoryButton";
import AddStepForm from "./AddStepForm";
import StepRow from "./StepRow";

export const dynamic = "force-dynamic";

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
      "id, slug, title, subtitle, intro, closing_title, closing_description",
    )
    .eq("id", categoryId)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const { data: steps } = await supabase
    .from("curriculum_steps")
    .select("id, icon, title, description")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

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
        /curriculum/{category.slug}
      </p>

      <div className="mt-6">
        <EditCategoryForm category={category} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-zinc-900">단계 관리</h2>
      <div className="mt-3">
        <AddStepForm categoryId={categoryId} slug={category.slug} />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {steps?.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            onUpdate={updateStep.bind(null, step.id, categoryId, category.slug)}
            onDelete={deleteStep.bind(null, step.id, categoryId, category.slug)}
          />
        ))}
        {steps?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 단계가 없습니다.</p>
        )}
      </ul>
    </div>
  );
}
