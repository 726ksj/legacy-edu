import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface ChatRoomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function ChatRoomNav({
  left,
  right,
}: {
  left: ChatRoomNavItem;
  right: ChatRoomNavItem;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NavCard item={left} />
      <NavCard item={right} />
    </div>
  );
}

function NavCard({ item }: { item: ChatRoomNavItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-lg font-bold text-zinc-900 group-hover:text-brand-dark">
        {item.label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-dark" />
    </Link>
  );
}
