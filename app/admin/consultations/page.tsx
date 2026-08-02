import { createAdminClient } from "@/lib/supabase/admin";
import { markConsultationComplete, deleteConsultation } from "./actions";
import DeleteConsultationButton from "./DeleteConsultationButton";

export const dynamic = "force-dynamic";

interface ConsultationRow {
  id: string;
  role: string;
  school: string;
  grade: string;
  phone: string;
  subject: string;
  mock_grade: string | null;
  school_exam_grade: string | null;
  message: string;
  status: string;
  created_at: string;
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: requests, error } = await supabase
    .from("consultation_requests")
    .select(
      "id, role, school, grade, phone, subject, mock_grade, school_exam_grade, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .returns<ConsultationRow[]>();

  const pendingCount = (requests ?? []).filter(
    (row) => row.status === "pending",
  ).length;

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/consultations
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">상담 신청 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생/학부모가 신청한 상담 내역을 확인하고 처리하는 페이지입니다.
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
        {requests?.map((row) => (
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
                  {row.role} · {row.school} · {row.grade} · [{row.subject}]
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(row.created_at).toLocaleString("ko-KR")}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-zinc-400">전화번호</dt>
                <dd className="text-zinc-900">{row.phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">모의고사 등급</dt>
                <dd className="text-zinc-900">{row.mock_grade ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">내신 등급</dt>
                <dd className="text-zinc-900">
                  {row.school_exam_grade ?? "-"}
                </dd>
              </div>
            </dl>

            <p className="mt-3 whitespace-pre-line text-sm text-zinc-700">
              {row.message}
            </p>

            <div className="mt-3 flex items-center gap-3">
              {row.status === "pending" && (
                <form action={markConsultationComplete.bind(null, row.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
                  >
                    처리완료로 표시
                  </button>
                </form>
              )}
              <DeleteConsultationButton
                action={deleteConsultation.bind(null, row.id)}
              />
            </div>
          </div>
        ))}
        {requests?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 상담 신청이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
