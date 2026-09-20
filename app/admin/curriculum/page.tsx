import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AddCategoryForm from "./AddCategoryForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from("curriculum_categories")
    .select("id, slug, title, subtitle")
    .order("sort_order", { ascending: true });

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: stepRows } = categoryIds.length
    ? await supabase
        .from("curriculum_steps")
        .select("category_id")
        .in("category_id", categoryIds)
    : { data: [] as { category_id: string }[] };

  const stepCountByCategory = new Map<string, number>();
  for (const row of stepRows ?? []) {
    stepCountByCategory.set(
      row.category_id,
      (stepCountByCategory.get(row.category_id) ?? 0) + 1,
    );
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">커리큘럼 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        홈 상단 "커리큘럼" 메뉴 하위에 노출되는 콘텐츠 블록을 관리합니다.
        각 항목은 <code>/curriculum/[슬러그]</code> 페이지로 공개됩니다.
      </p>

      <div className="mt-6">
        <AddCategoryForm />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">슬러그</th>
              <th className="px-4 py-3">단계 수</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories?.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{category.title}</p>
                  {category.subtitle && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {category.subtitle}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  /curriculum/{category.slug}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {stepCountByCategory.get(category.id) ?? 0}개
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/curriculum/${category.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    관리
                  </Link>
                </td>
              </tr>
            ))}
            {categories?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  등록된 커리큘럼이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
