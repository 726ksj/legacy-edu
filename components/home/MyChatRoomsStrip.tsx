import Link from "next/link";
import { MessageCircle } from "lucide-react";

export interface ChatRoomStripItem {
  courseId: string;
  subject: string;
  title: string;
  teacherName: string;
  hasUnread: boolean;
}

// "내가 수강 중인 강좌"(MyCoursesStrip)와 한눈에 구분되도록, 강좌 정보
// 카드가 아니라 메신저 앱의 대화 목록처럼(아이콘 + 가로 배치) 다르게
// 디자인한다.
export default function MyChatRoomsStrip({ rooms }: { rooms: ChatRoomStripItem[] }) {
  return (
    <div className="mt-8 w-full">
      <p className="mb-2 text-xs font-semibold text-zinc-500 lg:text-sm">
        채팅방 바로가기
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:gap-4">
        {rooms.map((room) => (
          <Link
            key={room.courseId}
            href={`/my-classroom/${room.courseId}/chat`}
            className="flex w-64 shrink-0 snap-start items-center gap-3 rounded-full border border-zinc-200 bg-white py-2 pl-2 pr-4 hover:border-brand lg:w-80 lg:py-2.5 lg:pl-2.5"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark lg:h-11 lg:w-11">
              <MessageCircle className="h-5 w-5" />
              {room.hasUnread && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-900">
                {room.title}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {room.subject} · {room.teacherName} 강사
              </p>
            </div>
            {room.hasUnread && (
              <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                NEW
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
