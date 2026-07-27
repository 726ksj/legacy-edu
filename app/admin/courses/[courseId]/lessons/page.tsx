import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMuxClient } from "@/lib/mux";
import UploadLessonForm from "./UploadLessonForm";
import DeleteLessonButton from "./DeleteLessonButton";
import { deleteLesson } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  preparing: { label: "처리 중", className: "bg-amber-100 text-amber-700" },
  ready: { label: "재생 가능", className: "bg-brand-light text-brand-dark" },
  errored: { label: "처리 실패", className: "bg-red-100 text-red-600" },
};

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title, teacher_name")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, order_no, title, mux_asset_id, status, created_at")
    .eq("course_id", courseId)
    .order("order_no", { ascending: true });

  if (lessons?.length) {
    const mux = createMuxClient();
    for (const lesson of lessons) {
      if (lesson.status !== "preparing" || !lesson.mux_asset_id) continue;

      try {
        const asset = await mux.video.assets.retrieve(lesson.mux_asset_id);
        if (asset.status === "ready") {
          const playbackId = asset.playback_ids?.[0]?.id ?? null;
          await supabase
            .from("lessons")
            .update({ status: "ready", mux_playback_id: playbackId })
            .eq("id", lesson.id);
          lesson.status = "ready";
        } else if (asset.status === "errored") {
          await supabase
            .from("lessons")
            .update({ status: "errored" })
            .eq("id", lesson.id);
          lesson.status = "errored";
        }
      } catch {
        // 아직 Mux에 반영되지 않았을 수 있음 - 다음 새로고침에 재시도
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/courses/{courseId}/lessons
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title} — 차시 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 선생님 강좌의 영상을 업로드하고 관리합니다.
      </p>

      <div className="mt-6">
        <UploadLessonForm courseId={courseId} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">차시</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">업로드일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lessons?.map((lesson) => {
              const statusInfo =
                STATUS_LABEL[lesson.status] ?? STATUS_LABEL.preparing;
              return (
                <tr key={lesson.id}>
                  <td className="px-4 py-3 text-zinc-700">
                    {lesson.order_no}강
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {lesson.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(lesson.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteLessonButton
                      action={deleteLesson.bind(null, lesson.id, courseId)}
                    />
                  </td>
                </tr>
              );
            })}
            {lessons?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  등록된 차시가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
