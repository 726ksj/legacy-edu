import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhone } from "@/lib/formatPhone";
import { formatDateTime } from "@/lib/formatDateTime";
import { markInquiryComplete, deleteInquiry } from "./actions";
import DeleteInquiryButton from "./DeleteInquiryButton";

export const dynamic = "force-dynamic";

interface InquiryRow {
  id: string;
  name: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: inquiries, error } = await supabase
    .from("inquiries")
    .select("id, name, phone, message, status, created_at")
    .order("created_at", { ascending: false })
    .returns<InquiryRow[]>();

  const pendingCount = (inquiries ?? []).filter(
    (row) => row.status === "pending",
  ).length;

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">1:1 문의 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        고객센터 화면에서 접수된 1:1 이용문의를 확인하고 처리하는
        페이지입니다.
        {pendingCount > 0 && (
          <span className="ml-2 font-semibold text-brand-dark">
            대기중 {pendingCount}건
          </span>
        )}
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {inquiries?.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                <span
                  className={
                    row.status === "pending"
                      ? "rounded-full bg-brand-light px-2 py-0.5 font-semibold text-brand-dark"
                      : "rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500"
                  }
                >
                  {row.status === "pending" ? "대기중" : "처리완료"}
                </span>
                <span>
                  {row.name} · {formatPhone(row.phone)}
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {formatDateTime(row.created_at)}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-line text-sm text-zinc-700">
              {row.message}
            </p>

            <div className="mt-3 flex items-center gap-3">
              {row.status === "pending" && (
                <form action={markInquiryComplete.bind(null, row.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
                  >
                    처리완료로 표시
                  </button>
                </form>
              )}
              <DeleteInquiryButton action={deleteInquiry.bind(null, row.id)} />
            </div>
          </div>
        ))}
        {inquiries?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 문의가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
