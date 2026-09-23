import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AddCategoryForm from "./AddCategoryForm";

export const dynamic = "force-dynamic";

interface CategoryTrackRow {
  slug: string;
  title: string;
  curriculum_school_levels: { slug: string; title: string } | null;
}

export default async function Page() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from("curriculum_categories")
    .select(
      "id, slug, title, subtitle, curriculum_tracks(slug, title, curriculum_school_levels(slug, title))",
    )
    .order("sort_order", { ascending: true })
    .returns<
      {
        id: string;
        slug: string;
        title: string;
        subtitle: string | null;
        curriculum_tracks: CategoryTrackRow | null;
      }[]
    >();

  const { data: tracks } = await supabase
    .from("curriculum_tracks")
    .select("id, title, curriculum_school_levels(title)")
    .order("sort_order", { ascending: true })
    .returns<
      { id: string; title: string; curriculum_school_levels: { title: string } | null }[]
    >();

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">커리큘럼 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            홈 상단 &ldquo;커리큘럼&rdquo; 메뉴 하위에 노출되는 콘텐츠 블록을
            관리합니다. 학교급·트랙에 배정된 항목은{" "}
            <code>/curriculum/[학교급]/[트랙]/[슬러그]</code>로, 미배정
            항목은 추후 홈 화면에 노출됩니다.
          </p>
        </div>
        <Link
          href="/admin/curriculum/structure"
          className="shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          학교급·트랙 관리
        </Link>
      </div>

      <div className="mt-6">
        <AddCategoryForm
          tracks={(tracks ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            curriculum_school_levels: t.curriculum_school_levels,
          }))}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">학교급 / 트랙</th>
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
                <td className="px-4 py-3 text-zinc-700">
                  {category.curriculum_tracks ? (
                    `${category.curriculum_tracks.curriculum_school_levels?.title ?? "-"} / ${category.curriculum_tracks.title}`
                  ) : (
                    <span className="text-zinc-400">미배정 (홈 화면)</span>
                  )}
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
