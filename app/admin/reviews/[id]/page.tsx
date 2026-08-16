import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditReviewForm from "./EditReviewForm";
import DeleteReviewButton from "../DeleteReviewButton";
import { deleteReviewAndRedirect } from "../actions";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("id, name, school, subject, summary, detail")
    .eq("id", id)
    .maybeSingle();

  if (!review) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/reviews"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 수강생 리뷰 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">{review.name} 리뷰 수정</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        리뷰 내용을 수정하거나 삭제할 수 있습니다.
      </p>

      <div className="mt-6 max-w-lg">
        <EditReviewForm review={review} />
      </div>

      <div className="mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          삭제하면 홈 화면에서도 바로 사라지며 되돌릴 수 없습니다.
        </p>
        <div className="mt-3">
          <DeleteReviewButton
            action={deleteReviewAndRedirect.bind(null, review.id)}
          />
        </div>
      </div>
    </div>
  );
}
