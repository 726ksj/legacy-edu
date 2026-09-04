"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ATTACHMENT_BUCKET = "chat-attachments";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export interface SendChatFileState {
  error?: string;
  success?: boolean;
}

// 채팅 메시지 전송 자체는 실시간을 위해 브라우저에서 직접 insert하지만,
// 파일 첨부는 스토리지 업로드 + 메시지 insert를 한 번에 처리해야 해서
// 서버 액션으로 뺐다. 어느 경로로 insert되든 구독 중인 클라이언트는
// 똑같이 postgres_changes로 받으니 실시간 동작엔 차이가 없다.
export async function sendChatFile(
  roomId: string,
  formData: FormData,
): Promise<SendChatFileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "파일을 선택해주세요." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "파일은 20MB 이하만 업로드할 수 있습니다." };
  }

  const admin = createAdminClient();

  const { data: room } = await admin
    .from("chat_rooms")
    .select("course_id, student_profile_id")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) {
    return { error: "채팅방을 찾을 수 없습니다." };
  }

  const isParticipant =
    room.student_profile_id === user.id ||
    Boolean(
      (
        await admin
          .from("course_teachers")
          .select("id")
          .eq("course_id", room.course_id)
          .eq("profile_id", user.id)
          .maybeSingle()
      ).data,
    );

  if (!isParticipant) {
    return { error: "이 채팅방에 파일을 보낼 권한이 없습니다." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const path = `${roomId}/${randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: uploadError } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: `파일 업로드에 실패했습니다: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);

  const { error: insertError } = await admin.from("chat_messages").insert({
    room_id: roomId,
    profile_id: user.id,
    content: "",
    file_url: publicUrl,
    file_name: file.name,
    file_type: file.type || null,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  return { success: true };
}
