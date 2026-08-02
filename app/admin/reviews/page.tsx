import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ReviewForm from "./ReviewForm";
import DeleteReviewButton from "./DeleteReviewButton";
import { deleteReview } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, name, school, subject, summary, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/reviews
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">수강생 리뷰 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        홈 화면 수강생 Review 섹션에 노출되는 후기를 등록/수정/삭제하는
        페이지입니다.
      </p>

      <div className="mt-6">
        <ReviewForm />
      </div>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">요약</th>
              <th className="px-4 py-3">등록일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.name}
                </td>
                <td className="px-4 py-3 text-zinc-700">{row.school}</td>
                <td className="px-4 py-3 text-zinc-700">{row.subject}</td>
                <td className="px-4 py-3 text-zinc-500">{row.summary}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/reviews/${row.id}`}
                      className="text-xs font-semibold text-brand-dark hover:underline"
                    >
                      수정
                    </Link>
                    <DeleteReviewButton
                      action={deleteReview.bind(null, row.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {reviews?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  등록된 리뷰가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
