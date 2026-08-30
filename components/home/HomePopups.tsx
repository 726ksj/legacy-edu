"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

interface PopupData {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
}

function storageKey(id: string) {
  return `popup_hidden_until_${id}`;
}

function isHiddenToday(id: string) {
  try {
    return (
      window.localStorage.getItem(storageKey(id)) === new Date().toDateString()
    );
  } catch {
    // 저장소 접근이 막혀 있으면(프라이빗 모드 등) 숨기지 않은 것으로 본다.
    return false;
  }
}

export default function HomePopups({ popups }: { popups: PopupData[] }) {
  // 최초 렌더(서버 HTML)와 클라이언트가 다르면 hydration 경고가 나므로,
  // localStorage 확인은 마운트 이후에만 한다. 여러 개가 활성화돼 있으면
  // 화면 중앙에 하나씩 순서대로 보여주고, 닫으면 다음 팝업이 이어서 뜬다.
  const [queue, setQueue] = useState<PopupData[] | null>(null);

  useEffect(() => {
    setQueue(popups.filter((p) => !isHiddenToday(p.id)));
  }, [popups]);

  if (!queue || queue.length === 0) return null;

  const current = queue[0];

  function dismiss() {
    setQueue((prev) => (prev ? prev.slice(1) : prev));
  }

  function hideToday() {
    try {
      window.localStorage.setItem(storageKey(current.id), new Date().toDateString());
    } catch {
      // 저장에 실패해도 이번 화면에서는 닫히도록 아래에서 계속 진행한다.
    }
    dismiss();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-md hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>

        {current.link_url ? (
          <Link href={current.link_url} onClick={dismiss}>
            <PopupBody popup={current} />
          </Link>
        ) : (
          <PopupBody popup={current} />
        )}

        <div className="grid grid-cols-2 divide-x divide-zinc-100 border-t border-zinc-100">
          <button
            type="button"
            onClick={dismiss}
            className="py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={hideToday}
            className="py-3 text-sm font-semibold text-brand-dark hover:bg-brand-light/40"
          >
            오늘 하루 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}

function PopupBody({ popup }: { popup: PopupData }) {
  return (
    <>
      {popup.image_url && (
        <div className="relative aspect-square w-full">
          <Image
            src={popup.image_url}
            alt={popup.title}
            fill
            sizes="(max-width: 480px) 100vw, 384px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-col gap-3 p-6 pr-10">
        <div className="h-[3px] w-10 rounded-full bg-brand" />
        <h2 className="text-lg font-bold text-zinc-900">{popup.title}</h2>
        {popup.body && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {popup.body}
          </p>
        )}
      </div>
    </>
  );
}
