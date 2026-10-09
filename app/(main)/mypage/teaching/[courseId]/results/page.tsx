import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseGradeManager } from "@/lib/teachers";
import {
  REVIEW_NEEDED_THRESHOLD,
  buildStudentResults,
  buildStudentWrongSummary,
  buildWordStats,
  summarizeResults,
  type ResultAttempt,
  type ResultNote,
  type ResultStatus,
  type ResultStudent,
} from "@/lib/vocabResults";

export const dynamic = "force-dynamic";

interface VocabSetRow {
  id: string;
  title: string;
  week: number | null;
  created_at: string;
  is_hidden: boolean;
}

interface AssignmentRow {
  vocab_sets: VocabSetRow | null;
}

interface EnrollmentRow {
  profiles: ResultStudent | null;
}

interface NoteRow extends ResultNote {
  vocab_set_id: string;
}

const STATUS_LABEL: Record<ResultStatus, { label: string; className: string }> = {
  completed: { label: "완료", className: "bg-brand-light text-brand-dark" },
  in_progress: { label: "진행 중", className: "bg-amber-100 text-amber-700" },
  not_started: { label: "미응시", className: "bg-zinc-100 text-zinc-500" },
};

function formatScore(score: number | null | undefined) {
  return score === null || score === undefined ? "-" : `${Math.round(score * 10) / 10}점`;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string; set?: string }>;
}) {
  const { courseId } = await params;
  const { tab: tabParam, set: setParam } = await searchParams;

  // 관리자, 담당 강사, 담당 조교만 볼 수 있다(조회 전용).
  try {
    await requireCourseGradeManager(courseId);
  } catch {
    notFound();
  }

  const tab = tabParam === "wrong" ? "wrong" : "students";
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) {
    notFound();
  }

  const [{ data: assignmentRows, error: setsError }, { data: enrollmentRows }] = await Promise.all([
    supabase
      .from("vocab_assignments")
      .select("vocab_sets(id, title, week, created_at, is_hidden)")
      .eq("course_id", courseId)
      .returns<AssignmentRow[]>(),
    supabase
      .from("enrollments")
      .select("profiles(id, name, username, school, grade)")
      .eq("course_id", courseId)
      .returns<EnrollmentRow[]>(),
  ]);

  const sets = (assignmentRows ?? [])
    .map((row) => row.vocab_sets)
    .filter((set): set is VocabSetRow => set !== null)
    .sort(
      (a, b) =>
        (a.week ?? 99) - (b.week ?? 99) || a.created_at.localeCompare(b.created_at),
    );

  const students = (enrollmentRows ?? [])
    .map((row) => row.profiles)
    .filter((profile): profile is ResultStudent => profile !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const studentIds = students.map((s) => s.id);

  // 학생별 결과는 단어장 하나를, 반 오답 현황은 전체(또는 하나)를 본다.
  const selectedSet =
    tab === "students"
      ? (sets.find((s) => s.id === setParam) ?? sets[sets.length - 1] ?? null)
      : (sets.find((s) => s.id === setParam) ?? null);

  const base = `/mypage/teaching/${courseId}/results`;
  const tabHref = (nextTab: string) => `${base}?tab=${nextTab}`;
  const setHref = (id: string | null) =>
    `${base}?tab=${tab}${id ? `&set=${id}` : ""}`;

  let content: React.ReactNode = null;
  let loadError: string | null = setsError?.message ?? null;

  if (sets.length === 0 || students.length === 0) {
    content = (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
        {sets.length === 0 ? "등록된 단어장이 없습니다." : "수강생이 없습니다."}
      </p>
    );
  } else if (tab === "students" && selectedSet) {
    const [{ data: attemptRows, error: attemptError }, { data: noteRows }, { data: wordRows }] =
      await Promise.all([
        supabase
          .from("vocab_test_attempts")
          .select("profile_id, round_no, status, score, correct_count, total_count")
          .eq("vocab_set_id", selectedSet.id)
          .in("profile_id", studentIds)
          .returns<ResultAttempt[]>(),
        supabase
          .from("vocab_wrong_notes")
          .select("profile_id, word_id, wrong_count, status, return_count, vocab_set_id")
          .eq("vocab_set_id", selectedSet.id)
          .in("profile_id", studentIds)
          .returns<NoteRow[]>(),
        supabase
          .from("vocab_words")
          .select("id, word, meaning")
          .eq("vocab_set_id", selectedSet.id),
      ]);
    loadError = loadError ?? attemptError?.message ?? null;

    const rows = buildStudentResults(students, attemptRows ?? []);
    const summary = summarizeResults(rows);
    const wordById = new Map((wordRows ?? []).map((w) => [w.id as string, w]));
    const notesByStudent = new Map<string, NoteRow[]>();
    for (const note of noteRows ?? []) {
      const list = notesByStudent.get(note.profile_id) ?? [];
      list.push(note);
      notesByStudent.set(note.profile_id, list);
    }

    content = (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "응시 완료", value: `${summary.completed}명` },
            { label: "진행 중", value: `${summary.inProgress}명` },
            { label: "미응시", value: `${summary.notStarted}명` },
            {
              label: "평균 종합 점수",
              value: summary.averageTotal === null ? "-" : `${summary.averageTotal}점`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
              <tr>
                <th className="px-4 py-3">학생</th>
                <th className="w-20 px-3 py-3">1회</th>
                <th className="w-20 px-3 py-3">2회</th>
                <th className="w-24 px-3 py-3">3회(최종)</th>
                <th className="w-20 px-3 py-3">4회</th>
                <th className="w-20 px-3 py-3">5회</th>
                <th className="w-24 px-4 py-3">종합</th>
                <th className="w-24 px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const studentNotes = notesByStudent.get(row.student.id) ?? [];
                const status = STATUS_LABEL[row.status];
                return (
                  <tr key={row.student.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{row.student.name}</p>
                      <p className="text-xs text-zinc-400">
                        {[row.student.school, row.student.grade].filter(Boolean).join(" · ") ||
                          row.student.username}
                      </p>
                      {studentNotes.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-brand-dark">
                            틀린 단어 {studentNotes.length}개
                          </summary>
                          <ul className="mt-2 flex flex-col gap-1 text-xs text-zinc-600">
                            {studentNotes
                              .sort((a, b) => b.wrong_count - a.wrong_count)
                              .map((note) => {
                                const word = wordById.get(note.word_id);
                                return (
                                  <li key={note.word_id} className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-zinc-900">
                                      {word?.word ?? "(삭제된 단어)"}
                                    </span>
                                    <span className="text-zinc-400">{word?.meaning}</span>
                                    <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                                      {note.wrong_count}번 틀림
                                    </span>
                                    <span
                                      className={
                                        "rounded px-1.5 py-0.5 " +
                                        (note.status === "graduated"
                                          ? "bg-brand-light text-brand-dark"
                                          : "bg-amber-100 text-amber-700")
                                      }
                                    >
                                      {note.status === "graduated" ? "마스터" : "남음"}
                                    </span>
                                  </li>
                                );
                              })}
                          </ul>
                        </details>
                      )}
                    </td>
                    {[1, 2, 3, 4, 5].map((roundNo) => (
                      <td key={roundNo} className="px-3 py-3 text-zinc-700">
                        {formatScore(row.rounds[roundNo]?.score)}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      {row.totalScore === null ? "-" : `${row.totalScore}점`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  } else {
    const scopeSetIds = selectedSet ? [selectedSet.id] : sets.map((s) => s.id);
    const { data: noteRows, error: noteError } = await supabase
      .from("vocab_wrong_notes")
      .select("profile_id, word_id, wrong_count, status, return_count, vocab_set_id")
      .in("vocab_set_id", scopeSetIds)
      .in("profile_id", studentIds)
      .returns<NoteRow[]>();
    loadError = loadError ?? noteError?.message ?? null;

    const notes = noteRows ?? [];
    const wordStats = buildWordStats(notes).slice(0, 20);
    const studentRows = buildStudentWrongSummary(students, notes);
    const reviewNeededCount = studentRows.filter((r) => r.needsReview).length;

    const { data: wordRows } = wordStats.length
      ? await supabase
          .from("vocab_words")
          .select("id, word, meaning")
          .in(
            "id",
            wordStats.map((s) => s.wordId),
          )
      : { data: [] as { id: string; word: string; meaning: string }[] };
    const wordById = new Map((wordRows ?? []).map((w) => [w.id as string, w]));

    content = (
      <>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-lg font-bold text-zinc-900">반에서 많이 틀린 단어</h2>
              <p className="mt-0.5 text-xs text-zinc-500">틀린 학생이 많은 순 (상위 20개)</p>
            </div>
            {wordStats.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-400">
                아직 틀린 단어가 없습니다.
              </p>
            ) : (
              <ol className="divide-y divide-zinc-100">
                {wordStats.map((stat, index) => {
                  const word = wordById.get(stat.wordId);
                  return (
                    <li key={stat.wordId} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-6 text-sm font-bold text-zinc-300">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900">{word?.word ?? "(삭제된 단어)"}</p>
                        <p className="truncate text-xs text-zinc-400">{word?.meaning}</p>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        <p>
                          <span className="font-bold text-zinc-900">{stat.wrongStudents}명</span> 틀림
                        </p>
                        <p>
                          남음 {stat.activeStudents}명 · 총 {stat.totalWrong}번
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">학생별 남은 오답</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  남은 오답 {REVIEW_NEEDED_THRESHOLD}개 이상은 점검 필요
                </p>
              </div>
              {reviewNeededCount > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                  점검 필요 {reviewNeededCount}명
                </span>
              )}
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-zinc-500">
                <tr>
                  <th className="px-5 py-2">학생</th>
                  <th className="w-16 px-2 py-2 text-right">남음</th>
                  <th className="w-16 px-2 py-2 text-right">마스터</th>
                  <th className="w-16 px-5 py-2 text-right">복귀</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {studentRows.map((row) => (
                  <tr key={row.student.id}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium text-zinc-900">{row.student.name}</span>
                      {row.needsReview && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">
                          점검 필요
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-zinc-900">{row.active}</td>
                    <td className="px-2 py-2.5 text-right text-zinc-600">{row.mastered}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-600">{row.returned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <div>
        <Link
          href={`/mypage/teaching/${courseId}`}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← {course.title}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">학습 결과</h1>
        <p className="mt-1 text-sm text-zinc-500">
          수강생의 단어 테스트 점수와 반 오답 현황입니다(조회 전용).
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          일부 정보를 불러오지 못했습니다: {loadError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "students", label: "학생별 결과" },
          { key: "wrong", label: "반 오답 현황" },
        ].map((item) => (
          <Link
            key={item.key}
            href={tabHref(item.key)}
            className={
              "rounded-full px-4 py-2 text-sm font-semibold " +
              (tab === item.key
                ? "bg-brand text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand")
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {sets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500">단어장</span>
          {tab === "wrong" && (
            <Link
              href={setHref(null)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold " +
                (!selectedSet
                  ? "bg-zinc-800 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400")
              }
            >
              전체
            </Link>
          )}
          {sets.map((set) => (
            <Link
              key={set.id}
              href={setHref(set.id)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold " +
                (selectedSet?.id === set.id
                  ? "bg-zinc-800 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400")
              }
            >
              {set.week ? `${set.week}주차 · ` : ""}
              {set.title}
              {set.is_hidden ? " (비공개)" : ""}
            </Link>
          ))}
        </div>
      )}

      {content}
    </div>
  );
}
