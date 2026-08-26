import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";

interface ScoreEntry {
  id: string;
  title: string;
  subject: string | null;
  score: string;
  exam_date: string | null;
  memo: string | null;
}

export default async function ScoreReportList({
  reportType,
  title,
  description,
}: {
  reportType: string;
  title: string;
  description: string;
}) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { data: entries } = await supabase
    .from("score_reports")
    .select("id, title, subject, score, exam_date, memo")
    .eq("profile_id", user.id)
    .eq("report_type", reportType)
    .order("exam_date", { ascending: false })
    .returns<ScoreEntry[]>();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <Link
          href="/mypage/score-report"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-zinc-400 hover:text-brand-dark"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          점수 리포트
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
      </div>

      {(!entries || entries.length === 0) && (
        <p className="text-sm text-zinc-500">아직 등록된 리포트가 없습니다.</p>
      )}

      <div className="flex flex-col gap-3">
        {entries?.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-brand/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-zinc-900">
                {entry.title}
                {entry.subject && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    [{entry.subject}]
                  </span>
                )}
              </p>
              {entry.exam_date && (
                <span className="shrink-0 text-xs text-zinc-400">
                  {entry.exam_date}
                </span>
              )}
            </div>
            <p className="mt-1 text-lg font-semibold text-brand-dark">
              {entry.score}
            </p>
            {entry.memo && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                {entry.memo}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
