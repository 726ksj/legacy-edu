import Link from "next/link";
import { MessageCircle } from "lucide-react";

export interface ChatRoomStripItem {
  courseId: string;
  subject: string;
  title: string;
  teacherName: string;
  hasUnread: boolean;
}

export default function MyChatRoomsStrip({ rooms }: { rooms: ChatRoomStripItem[] }) {
  return (
    <div className="mt-4 w-full">
      <p className="mb-2 text-xs font-semibold text-zinc-500 lg:text-sm">
        채팅방 바로가기
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:gap-4">
        {rooms.map((room) => (
          <Link
            key={room.courseId}
            href={`/my-classroom/${room.courseId}/chat`}
            className="relative w-44 shrink-0 snap-start rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand lg:w-56"
          >
            {room.hasUnread && (
              <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <MessageCircle className="h-5 w-5 text-brand-dark" />
            <p className="mt-2 line-clamp-1 text-sm font-bold text-zinc-900">
              {room.title}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {room.teacherName} 강사
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
