import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { createClient, getAuthUser, isAdmin } from "@/lib/supabase/server";
import { formatDate } from "@/lib/formatDateTime";
import EditNoticeForm from "./EditNoticeForm";
import DeleteNoticeButton from "../DeleteNoticeButton";
import { deleteNoticeAndRedirect } from "../actions";

export const dynamic = "force-dynamic";

interface AttachmentRow {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
}

export default async function NoticeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/notice/${id}`)}`);
  }

  const [{ data: notice }, { data: attachments }] = await Promise.all([
    supabase
      .from("notices")
      .select("id, category, title, content, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("notice_attachments")
      .select("id, file_name, file_url, file_type")
      .eq("notice_id", id)
      .order("created_at", { ascending: true })
      .returns<AttachmentRow[]>(),
  ]);

  if (!notice) {
    notFound();
  }

  const admin = isAdmin(user);
  const imageAttachments = (attachments ?? []).filter((a) =>
    a.file_type?.startsWith("image/"),
  );
  const fileAttachments = (attachments ?? []).filter(
    (a) => !a.file_type?.startsWith("image/"),
  );

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Notice
        </span>
        {admin && !edit && (
          <div className="flex items-center gap-3">
            <Link
              href={`/notice/${notice.id}?edit=1`}
              className="text-xs font-semibold text-brand-dark hover:underline"
            >
              수정
            </Link>
            <DeleteNoticeButton
              action={deleteNoticeAndRedirect.bind(null, notice.id)}
            />
          </div>
        )}
      </div>

      {admin && edit ? (
        <EditNoticeForm notice={notice} attachments={attachments ?? []} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-2 border-zinc-900 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={
                  notice.category === "이벤트"
                    ? "w-fit shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-dark"
                    : "w-fit shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark"
                }
              >
                {notice.category}
              </span>
              <h1 className="truncate text-lg font-bold text-zinc-900 sm:text-xl">
                {notice.title}
              </h1>
            </div>
            <span className="shrink-0 text-xs text-zinc-400">
              {formatDate(notice.created_at)}
            </span>
          </div>

          <div className="flex flex-col gap-6 border-t border-zinc-200 py-8">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {notice.content}
            </p>

            {imageAttachments.length > 0 && (
              <div className="flex flex-col gap-3">
                {imageAttachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-zinc-200"
                  >
                    {/* 업로드된 이미지의 실제 크기를 미리 알 수 없어, 비율이
                        왜곡되지 않도록 next/image 대신 일반 img를 쓴다. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="h-auto w-full"
                    />
                  </a>
                ))}
              </div>
            )}

            {fileAttachments.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-zinc-400">
                  첨부파일
                </p>
                <ul className="flex flex-col gap-1.5">
                  {fileAttachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-brand-dark hover:underline"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {attachment.file_name}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200" />

          <div className="flex justify-center">
            <Link
              href="/notice"
              className="rounded-md bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-900"
            >
              목록
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
