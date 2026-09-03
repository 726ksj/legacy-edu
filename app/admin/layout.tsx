import { redirect } from "next/navigation";
import { getAuthUser, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildThreads, countUnreadFromStudent } from "@/lib/questionThreads";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!isAdmin(user)) {
    redirect("/login");
  }

  const adminSupabase = createAdminClient();

  // 서로 무관한 집계 쿼리들이라 병렬로 요청한다.
  const [
    { data: questionRows },
    { count: pendingConsultationCount },
    { count: pendingInquiryCount },
  ] = await Promise.all([
    // "학생이 남긴 메시지 중 스태프가 아직 안 읽은 것"만 새 질문으로 쳐야
    // 해서(스태프 본인이 쓴 답변은 제외), 스레드 단위로 묶은 뒤 계산한다.
    adminSupabase
      .from("questions")
      .select(
        "id, parent_id, content, created_at, lesson_id, profile_id, question_read_at, answer_read_at",
      ),
    adminSupabase
      .from("consultation_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    adminSupabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const hasNewNote = buildThreads(questionRows ?? []).some(
    (thread) => countUnreadFromStudent(thread) > 0,
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar
        hasNewNote={hasNewNote}
        pendingConsultationCount={pendingConsultationCount ?? 0}
        pendingInquiryCount={pendingInquiryCount ?? 0}
      />
      <div className="flex flex-1 flex-col bg-zinc-50">{children}</div>
    </div>
  );
}
