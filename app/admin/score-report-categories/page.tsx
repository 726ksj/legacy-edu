import { createAdminClient } from "@/lib/supabase/admin";
import { updateCategory, deleteCategory } from "./actions";
import AddCategoryForm from "./AddCategoryForm";
import CategoryRow from "./CategoryRow";

export const dynamic = "force-dynamic";

interface CategoryData {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export default async function Page() {
  const supabase = createAdminClient();

  const [{ data: categories }, { data: reports }] = await Promise.all([
    supabase
      .from("score_report_categories")
      .select("id, slug, label, description, sort_order")
      .order("sort_order", { ascending: true })
      .returns<CategoryData[]>(),
    supabase.from("score_reports").select("report_type"),
  ]);

  const countBySlug = new Map<string, number>();
  for (const row of reports ?? []) {
    countBySlug.set(
      row.report_type,
      (countBySlug.get(row.report_type) ?? 0) + 1,
    );
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        점수 리포트 카테고리 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생 마이페이지의 "점수 리포트"와 회원 상세 페이지의 리포트 입력
        항목에 표시되는 카테고리입니다. 여기서 추가·수정·삭제하면 즉시
        반영됩니다.
      </p>

      <div className="mt-6 max-w-2xl">
        <AddCategoryForm />
      </div>

      <ul className="mt-6 flex max-w-2xl flex-col gap-3">
        {categories?.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            reportCount={countBySlug.get(category.slug) ?? 0}
            onUpdate={updateCategory.bind(null, category.id)}
            onDelete={deleteCategory.bind(null, category.id)}
          />
        ))}
        {categories?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 카테고리가 없습니다.</p>
        )}
      </ul>
    </div>
  );
}
