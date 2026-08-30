import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditPopupForm from "./EditPopupForm";
import DeletePopupButton from "../DeletePopupButton";
import { deletePopupAndRedirect } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: popup } = await supabase
    .from("popups")
    .select("id, title, body, image_url, link_url, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!popup) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/popups"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 팝업 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">팝업 수정</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        팝업 내용을 수정하거나 삭제할 수 있습니다.
      </p>

      <div className="mt-6 max-w-2xl">
        <EditPopupForm popup={popup} />
      </div>

      <div className="mt-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          삭제하면 홈페이지에서도 바로 사라지며 되돌릴 수 없습니다.
        </p>
        <div className="mt-3">
          <DeletePopupButton
            action={deletePopupAndRedirect.bind(null, popup.id)}
          />
        </div>
      </div>
    </div>
  );
}
