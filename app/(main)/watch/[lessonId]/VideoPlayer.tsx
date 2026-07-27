"use client";

import { useRef } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";

export default function VideoPlayer({
  playbackId,
  token,
  title,
}: {
  playbackId: string;
  token: string;
  title: string;
}) {
  const playerRef = useRef<MuxPlayerElement>(null);

  function skip(seconds: number) {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = Math.max(0, player.currentTime + seconds);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg bg-black">
        <MuxPlayer
          ref={playerRef}
          playbackId={playbackId}
          tokens={{ playback: token }}
          streamType="on-demand"
          metadata={{ video_title: title }}
          defaultHiddenCaptions
          playbackRates={[0.75, 1, 1.25, 1.5, 2]}
          className="aspect-video w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => skip(-10)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          ⏪ 10초
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          10초 ⏩
        </button>
      </div>
    </div>
  );
}
