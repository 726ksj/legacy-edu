import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCategory, deleteCategory } from "./actions";
import AddCategoryForm from "./AddCategoryForm";
import CategoryRow from "./CategoryRow";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

interface CategoryData {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
  max_score: number;
}

export default async function Page() {
  const supabase = createAdminClient();

  const [{ data: categories }, { data: reports }] = await Promise.all([
    supabase
      .from("score_report_categories")
      .select("id, slug, label, description, sort_order, max_score")
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">성적 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            학생 마이페이지의 "점수 리포트"에 표시되는 카테고리를 관리하고,
            엑셀로 성적을 일괄 등록할 수 있습니다.
          </p>
        </div>
        <Link
          href="/admin/score-report-categories/dashboard"
          className="shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          대시보드 보기
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold text-zinc-900">카테고리 관리</h2>
          <p className="mt-1 text-sm text-zinc-500">
            추가·수정·삭제하면 학생 화면과 회원 상세 페이지의 리포트 입력
            항목에 즉시 반영됩니다.
          </p>

          <div className="mt-4">
            <AddCategoryForm />
          </div>

          <ul className="mt-4 flex flex-col gap-3">
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
              <p className="text-sm text-zinc-400">
                등록된 카테고리가 없습니다.
              </p>
            )}
          </ul>
        </section>

        <section className="border-t border-zinc-200 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <h2 className="text-lg font-bold text-zinc-900">성적 업로드</h2>
          <p className="mt-1 text-sm text-zinc-500">
            카테고리와 시험명을 지정하고 엑셀 파일을 올리면, 행마다 회원을
            찾아 점수 리포트로 등록합니다.
          </p>

          <div className="mt-4">
            <UploadForm
              categories={(categories ?? []).map((c) => ({
                id: c.id,
                label: c.label,
              }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
