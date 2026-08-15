import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import EditUserForm from "./EditUserForm";
import ResetPasswordForm from "./ResetPasswordForm";
import DeleteUserButton from "../DeleteUserButton";
import { updateNote } from "./actions";
import {
  addScoreReport,
  updateScoreReport,
  deleteScoreReport,
} from "./score-actions";
import { deleteEnrollment } from "../../enrollments/actions";
import DeleteEnrollmentButton from "../../enrollments/DeleteEnrollmentButton";
import NoteCard from "@/components/notes/NoteCard";
import ScoreReportSection, {
  type ScoreReportEntry,
} from "@/components/admin/ScoreReportSection";
import { REPORT_TYPES, REPORT_TYPE_LABELS } from "@/lib/scoreReports";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  id: string;
  course_id: string;
  enrolled_at: string;
  courses: { subject: string; title: string } | null;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  lessons: {
    title: string;
    course_id: string;
    courses: { subject: string; title: string } | null;
  } | null;
}

interface ScoreReportRow {
  id: string;
  report_type: string;
  title: string;
  subject: string | null;
  score: string;
  exam_date: string | null;
  memo: string | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("profiles")
    .select(
      "id, username, name, phone, guardian_phone, address, school, grade, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    notFound();
  }

  const [{ data: enrollments }, { data: notes }, { data: scoreReports }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("id, course_id, enrolled_at, courses(subject, title)")
        .eq("profile_id", id)
        .order("enrolled_at", { ascending: false })
        .returns<EnrollmentRow[]>(),
      supabase
        .from("questions")
        .select(
          "id, content, created_at, lesson_id, lessons(title, course_id, courses(subject, title))",
        )
        .eq("profile_id", id)
        .order("created_at", { ascending: false })
        .returns<NoteRow[]>(),
      supabase
        .from("score_reports")
        .select("id, report_type, title, subject, score, exam_date, memo")
        .eq("profile_id", id)
        .order("exam_date", { ascending: false })
        .returns<ScoreReportRow[]>(),
    ]);

  const scoreReportsByType = new Map<string, ScoreReportEntry[]>();
  for (const row of scoreReports ?? []) {
    const list = scoreReportsByType.get(row.report_type) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      subject: row.subject,
      score: row.score,
      examDate: row.exam_date,
      memo: row.memo,
    });
    scoreReportsByType.set(row.report_type, list);
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/users"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 회원 관리
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">
        {user.name} 회원 정보
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        아이디 {user.username} · 가입일{" "}
        {new Date(user.created_at).toLocaleString("ko-KR")}
      </p>

      <div className="mt-6 max-w-lg">
        <EditUserForm user={user} />
      </div>

      <div className="mt-6 max-w-lg">
        <ResetPasswordForm userId={user.id} />
      </div>

      <div className="mt-6 max-w-2xl">
        <h2 className="text-lg font-bold text-zinc-900">수강 중인 강좌</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {(!enrollments || enrollments.length === 0) && (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">
              수강 중인 강좌가 없습니다.
            </p>
          )}
          {enrollments && enrollments.length > 0 && (
            <ul className="divide-y divide-zinc-100">
              {enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      [{enrollment.courses?.subject}]{" "}
                      {enrollment.courses?.title}
                    </p>
                    <p className="text-xs text-zinc-400">
                      등록일{" "}
                      {new Date(enrollment.enrolled_at).toLocaleString(
                        "ko-KR",
                      )}
                    </p>
                  </div>
                  <DeleteEnrollmentButton
                    action={deleteEnrollment.bind(null, enrollment.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 max-w-2xl">
        <h2 className="text-lg font-bold text-zinc-900">메모장</h2>
        <div className="mt-3 flex flex-col gap-3">
          {(!notes || notes.length === 0) && (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
              작성한 메모가 없습니다.
            </p>
          )}
          {notes?.map((note) => (
            <NoteCard
              key={note.id}
              content={note.content}
              updateAction={updateNote.bind(null, note.id, user.id, {})}
              header={
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-zinc-500">
                    [{note.lessons?.courses?.subject}]{" "}
                    {note.lessons?.courses?.title} · {note.lessons?.title}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(note.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-6 max-w-2xl">
        <h2 className="text-lg font-bold text-zinc-900">리포트</h2>
        <div className="mt-3 flex flex-col gap-4">
          {REPORT_TYPES.map((reportType) => (
            <ScoreReportSection
              key={reportType}
              label={REPORT_TYPE_LABELS[reportType]}
              entries={scoreReportsByType.get(reportType) ?? []}
              addAction={addScoreReport.bind(null, user.id, reportType)}
              updateAction={updateScoreReport.bind(null, user.id)}
              deleteAction={deleteScoreReport.bind(null, user.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">위험 구역</p>
        <p className="mt-1 text-xs text-red-600">
          탈퇴 처리하면 로그인 계정과 프로필, 수강 등록 정보가 모두 삭제되며
          되돌릴 수 없습니다.
        </p>
        <div className="mt-3">
          <DeleteUserButton userId={user.id} />
        </div>
      </div>
    </div>
  );
}
