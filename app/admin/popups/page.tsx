import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import PopupForm from "./PopupForm";
import DeletePopupButton from "./DeletePopupButton";
import { deletePopup } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: popups, error } = await supabase
    .from("popups")
    .select("id, title, image_url, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">팝업 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        홈페이지 접속 시 뜨는 팝업을 등록·수정하고, 노출 여부를 켜고 끌 수
        있습니다. 여러 개를 만들어두고 그중 노출할 것만 켜두면 됩니다.
      </p>

      <div className="mt-6">
        <PopupForm />
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
              <th className="px-4 py-3">미리보기</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">노출 여부</th>
              <th className="px-4 py-3">등록일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {popups?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  {row.image_url ? (
                    <Image
                      src={row.image_url}
                      alt={row.title}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">이미지 없음</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.title}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.is_active
                        ? "rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark"
                        : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500"
                    }
                  >
                    {row.is_active ? "노출 중" : "꺼짐"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/popups/${row.id}`}
                      className="text-xs font-semibold text-brand-dark hover:underline"
                    >
                      수정
                    </Link>
                    <DeletePopupButton
                      action={deletePopup.bind(null, row.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {popups?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  등록된 팝업이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
