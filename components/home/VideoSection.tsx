import { Play } from "lucide-react";

export default function VideoSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div>
        <span className="text-sm font-semibold text-brand-dark">
          LEGACY EDU
        </span>
        <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          학원 실제 후기
        </h2>
      </div>

      <div className="mt-8 flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-900">
        <div className="flex flex-col items-center gap-2 text-white/80">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Play className="h-6 w-6" />
          </span>
          <p className="text-sm">영상은 관리자 페이지에서 등록되면 표시됩니다.</p>
        </div>
      </div>
    </section>
  );
}
