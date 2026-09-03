import Link from "next/link";
import { createClient, getAuthUser, isAdmin } from "@/lib/supabase/server";
import { formatDate } from "@/lib/formatDateTime";
import NoticeForm from "./NoticeForm";
import MarkNoticeSeen from "@/components/notice/MarkNoticeSeen";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

interface NoticeRow {
  id: string;
  category: string;
  title: string;
  created_at: string;
  visibility: string;
}

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/notice?${qs}` : "/notice";
}

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; write?: string; q?: string }>;
}) {
  const { page: pageParam, write, q } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  // 비회원은 로그인을 요구하지 않는다 - RLS가 이미 visibility='public'인
  // 글만 anon 세션에 내려주므로, 로그인한 회원은 전체 공지가 보이고
  // 비회원은 전체공개 공지만 자연스럽게 걸러져서 보인다.
  const user = await getAuthUser();

  let noticesQuery = supabase
    .from("notices")
    .select("id, category, title, created_at, visibility", { count: "exact" })
    .order("created_at", { ascending: false });

  if (query) {
    noticesQuery = noticesQuery.ilike("title", `%${query}%`);
  }

  const { data: notices, count } = await noticesQuery
    .range(from, to)
    .returns<NoticeRow[]>();

  // 검색/페이지네이션과 무관하게 "가장 최근 글"을 따로 조회한다 - 헤더의
  // NEW 뱃지가 보는 기준과 항상 일치시키기 위해서다.
  const { data: latestNotice } = await supabase
    .from("notices")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const admin = isAdmin(user);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <MarkNoticeSeen noticeId={latestNotice?.id ?? null} />
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

      <form action="/notice" method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="제목으로 검색"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          검색
        </button>
      </form>

      {(!notices || notices.length === 0) && (
        <p className="text-sm text-zinc-500">
          {query
            ? `'${query}'에 대한 검색 결과가 없습니다.`
            : "등록된 공지사항이 없습니다."}
        </p>
      )}

      {notices && notices.length > 0 && (
        <div className="border-t-2 border-zinc-900">
          <div className="hidden border-b border-zinc-200 px-2 py-3 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-[5rem_1fr_7rem]">
            <span>분류</span>
            <span>제목</span>
            <span className="text-right">등록일</span>
          </div>
          <ul className="flex flex-col divide-y divide-zinc-200">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notice/${notice.id}`}
                  className="flex items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-zinc-50 sm:grid sm:grid-cols-[5rem_1fr_7rem]"
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
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-zinc-900">
                      {notice.title}
                    </span>
                    {notice.visibility === "members" && (
                      <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                        회원전용
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400 sm:text-right">
                    {formatDate(notice.created_at)}
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
            href={buildPageHref(Math.max(1, page - 1), query)}
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
              href={buildPageHref(n, query)}
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
            href={buildPageHref(Math.min(totalPages, page + 1), query)}
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
