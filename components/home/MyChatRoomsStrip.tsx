import Link from "next/link";

export interface ChatRoomStripItem {
  courseId: string;
  subject: string;
  title: string;
  teacherName: string;
  hasUnread: boolean;
}

// "내가 수강 중인 강좌"(MyCoursesStrip)와 카드 모양을 그대로 맞춘다 -
// 안읽음 배지만 하나 더 얹은 형태.
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
            className="relative w-56 shrink-0 snap-start rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand lg:w-[21rem] lg:p-6"
          >
            {room.hasUnread && (
              <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <p className="text-xs font-semibold text-brand-dark lg:text-sm">
              {room.subject}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-zinc-900 lg:text-lg">
              {room.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500 lg:text-sm">
              {room.teacherName} 강사
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
