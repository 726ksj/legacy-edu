import Link from "next/link";
import { createClient, getAuthUser, isAdmin } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/formatDateTime";
import NoticeForm from "./NoticeForm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

interface NoticeRow {
  id: string;
  category: string;
  title: string;
  created_at: string;
}

function buildPageHref(page: number) {
  return page <= 1 ? "/notice" : `/notice?page=${page}`;
}

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; write?: string }>;
}) {
  const { page: pageParam, write } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const [user, { data: notices, count }] = await Promise.all([
    getAuthUser(),
    supabase
      .from("notices")
      .select("id, category, title, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<NoticeRow[]>(),
  ]);

  const admin = isAdmin(user);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Notice
        </span>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            공지사항
          </h1>
          {admin && !write && (
            <Link
              href="/notice?write=1"
              className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              글쓰기
            </Link>
          )}
        </div>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          LEGACY EDU의 공지와 이벤트 소식을 확인하세요.
        </p>
      </div>

      {admin && write && <NoticeForm />}

      {(!notices || notices.length === 0) && (
        <p className="text-sm text-zinc-500">등록된 공지사항이 없습니다.</p>
      )}

      {notices && notices.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-[5rem_1fr_7rem]">
            <span>분류</span>
            <span>제목</span>
            <span className="text-right">등록일</span>
          </div>
          <ul className="flex flex-col divide-y divide-zinc-100">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notice/${notice.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 sm:grid sm:grid-cols-[5rem_1fr_7rem]"
                >
                  <span
                    className={
                      notice.category === "이벤트"
                        ? "w-fit shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-dark"
                        : "w-fit shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark"
                    }
                  >
                    {notice.category}
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-900">
                    {notice.title}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400 sm:text-right">
                    {formatDateTime(notice.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5">
          <Link
            href={buildPageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? "pointer-events-none px-2 py-1 text-sm text-zinc-300"
                : "px-2 py-1 text-sm text-zinc-500 hover:text-brand-dark"
            }
          >
            이전
          </Link>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={buildPageHref(n)}
              className={
                n === page
                  ? "flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white"
                  : "flex h-8 w-8 items-center justify-center rounded-md text-sm text-zinc-500 hover:bg-zinc-100"
              }
            >
              {n}
            </Link>
          ))}
          <Link
            href={buildPageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages
                ? "pointer-events-none px-2 py-1 text-sm text-zinc-300"
                : "px-2 py-1 text-sm text-zinc-500 hover:text-brand-dark"
            }
          >
            다음
          </Link>
        </nav>
      )}
    </section>
  );
}
