import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { formatPhone } from "@/lib/formatPhone";
import { deleteReport } from "../actions";
import DeleteReportButton from "./DeleteReportButton";

export const dynamic = "force-dynamic";

interface ReportRow {
  id: string;
  title: string;
  subject: string | null;
  score: string;
  exam_date: string | null;
  memo: string | null;
  extra_data: Record<string, string> | null;
  profiles: { name: string; phone: string | null } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("score_report_categories")
    .select("id, slug, label, description, extra_field_labels")
    .eq("id", id)
    .maybeSingle();

  if (!category) notFound();

  const extraFieldLabels: string[] = category.extra_field_labels ?? [];

  const reports = await fetchAllRows<ReportRow>((from, to) =>
    supabase
      .from("score_reports")
      .select(
        "id, title, subject, score, exam_date, memo, extra_data, profiles(name, phone)",
      )
      .eq("report_type", category.slug)
      .order("exam_date", { ascending: false })
      .range(from, to)
      .returns<ReportRow[]>(),
  );

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/score-report-categories"
        className="inline-flex w-fit items-center gap-0.5 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        성적 관리
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900">
        {category.label}
      </h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          {category.description}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">전화번호</th>
              <th className="px-4 py-3">시험명</th>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">점수</th>
              {extraFieldLabels.map((label) => (
                <th key={label} className="px-4 py-3">
                  {label}
                </th>
              ))}
              <th className="px-4 py-3">시험일</th>
              <th className="px-4 py-3">메모</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reports?.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-3 text-zinc-700">
                  {report.profiles?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {report.profiles?.phone
                    ? formatPhone(report.profiles.phone)
                    : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-700">{report.title}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {report.subject ?? "-"}
                </td>
                <td className="px-4 py-3 font-semibold text-brand-dark">
                  {report.score}
                </td>
                {extraFieldLabels.map((label) => (
                  <td key={label} className="px-4 py-3 text-zinc-500">
                    {report.extra_data?.[label] ?? "-"}
                  </td>
                ))}
                <td className="px-4 py-3 text-zinc-500">
                  {report.exam_date ?? "-"}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-zinc-500">
                  {report.memo ?? "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteReportButton
                    action={deleteReport.bind(null, category.id, report.id)}
                  />
                </td>
              </tr>
            ))}
            {(!reports || reports.length === 0) && (
              <tr>
                <td
                  colSpan={8 + extraFieldLabels.length}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  등록된 리포트가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
