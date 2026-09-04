"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircleMore, Paperclip, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendChatFile } from "@/lib/chatMessages";

export interface ChatMessageView {
  id: string;
  profileId: string;
  content: string;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isImageFile(fileType?: string | null) {
  return Boolean(fileType?.startsWith("image/"));
}

export default function ChatRoom({
  roomId,
  viewerId,
  initialMessages,
  participantNames,
  readOnly = false,
}: {
  roomId: string;
  viewerId: string;
  initialMessages: ChatMessageView[];
  participantNames: Record<string, string>;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // useState의 lazy initializer로 브라우저 클라이언트를 최초 1회만
  // 만든다 - useRef(createClient())는 렌더마다 인자가 평가돼 매번 새
  // 인스턴스를 만들었다 버리고, 렌더 중 ref.current를 직접 건드리는
  // 것도 이 프로젝트 lint 규칙(react-hooks/refs)에서 막는다.
  const [supabase] = useState(() => createClient());

  // 이 방의 새 메시지를 실시간으로 구독한다 - INSERT마다 로컬 목록에
  // 바로 붙여서 새로고침 없이 갱신되게 한다. 파일 메시지는 서버 액션(서비스
  // 롤)으로 insert되지만, 구독은 insert 주체와 무관하게 똑같이 받는다.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            profile_id: string;
            content: string;
            created_at: string;
            file_url: string | null;
            file_name: string | null;
            file_type: string | null;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                profileId: row.profile_id,
                content: row.content,
                createdAt: row.created_at,
                fileUrl: row.file_url,
                fileName: row.file_name,
                fileType: row.file_type,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // 방을 보고 있는 동안(처음 열었을 때 + 새 메시지가 쌓일 때마다)
  // "마지막으로 읽은 시각"을 갱신한다 - 다른 화면의 안읽음 뱃지 계산용.
  useEffect(() => {
    if (readOnly) return;
    supabase
      .from("chat_room_reads")
      .upsert(
        { room_id: roomId, profile_id: viewerId, last_read_at: new Date().toISOString() },
        { onConflict: "room_id,profile_id" },
      )
      .then(() => {});
  }, [roomId, viewerId, messages.length, readOnly, supabase]);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setIsSending(true);
    setError(null);
    const { error: insertError } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      profile_id: viewerId,
      content: trimmed,
    });
    setIsSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setContent("");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await sendChatFile(roomId, formData);
    setIsUploading(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-zinc-50/60 p-4">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-300">
            <MessageCircleMore className="h-10 w-10" />
            <p className="text-sm text-zinc-400">아직 메시지가 없습니다.</p>
          </div>
        )}
        {messages.map((message) => {
          const isOwn = message.profileId === viewerId;
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <span className="px-1 text-xs font-medium text-zinc-400">
                {participantNames[message.profileId] ?? "-"}
              </span>
              <div
                className={`mt-0.5 flex items-end gap-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                {message.fileUrl ? (
                  isImageFile(message.fileType) ? (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-2xl border border-zinc-200 shadow-sm"
                    >
                      <Image
                        src={message.fileUrl}
                        alt={message.fileName ?? "첨부 이미지"}
                        width={220}
                        height={220}
                        className="h-auto max-h-64 w-auto max-w-[70vw] object-cover sm:max-w-xs"
                      />
                    </a>
                  ) : (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex max-w-[70vw] items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm shadow-sm sm:max-w-sm ${
                        isOwn
                          ? "border-brand bg-brand-light/40 text-brand-dark"
                          : "border-zinc-200 bg-white text-zinc-700"
                      }`}
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate underline">
                        {message.fileName ?? "첨부파일"}
                      </span>
                    </a>
                  )
                ) : (
                  <div
                    className={`max-w-[70vw] px-3.5 py-2.5 text-sm shadow-sm sm:max-w-sm ${
                      isOwn
                        ? "rounded-2xl rounded-br-sm bg-brand text-white"
                        : "rounded-2xl rounded-bl-sm bg-white text-zinc-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
                <span className="shrink-0 text-[11px] text-zinc-400">
                  {formatTime(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {readOnly ? (
        <p className="border-t border-zinc-200 bg-white px-3 py-2.5 text-center text-xs text-zinc-400">
          모니터링 전용 화면입니다.
        </p>
      ) : (
        <div className="border-t border-zinc-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="파일 첨부"
              title="파일 첨부"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:border-brand hover:text-brand-dark disabled:opacity-60"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={
                isUploading ? "파일 업로드 중..." : "메시지를 입력하세요"
              }
              className="flex-1 resize-none rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:bg-white"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !content.trim()}
              aria-label="전송"
              title="전송"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-1.5 px-1 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
