import { redirect, notFound } from "next/navigation";
import { Home, ListVideo, MessageCircle } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEnrolled } from "@/lib/enrollments";
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

export default async function CourseChatPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const enrolled = await isEnrolled(supabase, user.id, courseId);
  if (!enrolled) {
    notFound();
  }

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, subject, title")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const roomId = await findOrCreateChatRoom(courseId, user.id);

  const [{ data: staffRows }, { data: messageRows }] = await Promise.all([
    admin
      .from("course_teachers")
      .select("profiles(id, name)")
      .eq("course_id", courseId)
      .returns<{ profiles: { id: string; name: string } | null }[]>(),
    admin
      .from("chat_messages")
      .select("id, profile_id, content, created_at, file_url, file_name, file_type")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .returns<MessageRow[]>(),
  ]);

  const participantNames: Record<string, string> = {
    [user.id]: "나",
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
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-light/60 to-white p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-dark">
            {course.subject}
          </p>
          <h1 className="truncate text-xl font-bold text-zinc-900 sm:text-2xl">
            {course.title} 채팅방
          </h1>
        </div>
      </div>

      <ChatRoom
        roomId={roomId}
        viewerId={user.id}
        initialMessages={initialMessages}
        participantNames={participantNames}
      />

      <ChatRoomNav
        left={{ label: "나의 강의실", href: "/my-classroom", icon: Home }}
        right={{
          label: "차시 목록",
          href: `/my-classroom/${courseId}`,
          icon: ListVideo,
        }}
      />
    </section>
  );
}
