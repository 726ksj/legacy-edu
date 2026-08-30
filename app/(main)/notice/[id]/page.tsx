import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Paperclip } from "lucide-react";
import { createClient, getAuthUser, isAdmin } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/formatDateTime";
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
  const [user, { data: notice }, { data: attachments }] = await Promise.all([
    getAuthUser(),
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
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <Link
        href="/notice"
        className="inline-flex w-fit items-center gap-0.5 text-xs font-semibold text-zinc-400 hover:text-brand-dark"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        공지사항
      </Link>

      {admin && edit ? (
        <EditNoticeForm notice={notice} attachments={attachments ?? []} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Notice
              </span>
              {admin && (
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
            <span
              className={
                notice.category === "이벤트"
                  ? "w-fit rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-dark"
                  : "w-fit rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark"
              }
            >
              {notice.category}
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {notice.title}
            </h1>
            <div className="h-[3px] w-12 rounded-full bg-brand" />
            <p className="text-xs text-zinc-400">
              {formatDateTime(notice.created_at)}
            </p>
          </div>
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
            <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500">첨부파일</p>
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
                      <span className="truncate">{attachment.file_name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
