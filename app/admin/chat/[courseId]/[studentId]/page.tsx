import { notFound } from "next/navigation";
import { Eye, MessagesSquare, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { findOrCreateChatRoom } from "@/lib/chatRooms";
import ChatRoom, { type ChatMessageView } from "@/components/chat/ChatRoom";
import ChatRoomNav from "@/components/chat/ChatRoomNav";

export const dynamic = "force-dynamic";

interface MessageRow {
  id: string;
  profile_id: string;
  content: string;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;
  const adminUser = await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: course }, { data: enrollment }, { data: staffRows }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, subject, title")
        .eq("id", courseId)
        .maybeSingle(),
      supabase
        .from("enrollments")
        .select("profile_id, profiles(name)")
        .eq("course_id", courseId)
        .eq("profile_id", studentId)
        .maybeSingle<{ profile_id: string; profiles: { name: string } | null }>(),
      supabase
        .from("course_teachers")
        .select("profiles(id, name)")
        .eq("course_id", courseId)
        .returns<{ profiles: { id: string; name: string } | null }[]>(),
    ]);

  if (!course || !enrollment) {
    notFound();
  }

  const roomId = await findOrCreateChatRoom(courseId, studentId);

  const { data: messageRows } = await supabase
    .from("chat_messages")
    .select("id, profile_id, content, created_at, file_url, file_name, file_type")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>();

  const participantNames: Record<string, string> = {
    [studentId]: enrollment.profiles?.name ?? "학생",
  };
  for (const row of staffRows ?? []) {
    if (row.profiles) {
      participantNames[row.profiles.id] = row.profiles.name;
    }
  }

  const initialMessages: ChatMessageView[] = (messageRows ?? []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    content: row.content,
    createdAt: row.created_at,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileType: row.file_type,
  }));

  return (
    <div className="flex flex-1 flex-col p-8">
      <div className="flex max-w-2xl items-center gap-3 rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-light/60 to-white p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Eye className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-dark">
            [{course.subject}] {course.title} · 모니터링 전용
          </p>
          <h1 className="truncate text-xl font-bold text-zinc-900 sm:text-2xl">
            {enrollment.profiles?.name} 학생과의 채팅방
          </h1>
        </div>
      </div>

      <div className="mt-6 flex max-w-2xl flex-col gap-3">
        <ChatRoom
          roomId={roomId}
          viewerId={adminUser!.id}
          initialMessages={initialMessages}
          participantNames={participantNames}
          readOnly
        />

        <ChatRoomNav
          left={{
            label: "채팅 모니터링",
            href: "/admin/chat",
            icon: MessagesSquare,
          }}
          right={{
            label: `${course.title} 학생 목록`,
            href: `/admin/chat/${courseId}`,
            icon: Users,
          }}
        />
      </div>
    </div>
  );
}
