"use client";

import MuxPlayer from "@mux/mux-player-react";

export default function VideoPlayer({
  playbackId,
  token,
  title,
}: {
  playbackId: string;
  token: string;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-black">
      <MuxPlayer
        playbackId={playbackId}
        tokens={{ playback: token }}
        streamType="on-demand"
        metadata={{ video_title: title }}
        defaultHiddenCaptions
        playbackRates={[0.75, 1, 1.25, 1.5, 2]}
        className="aspect-video w-full"
      />
    </div>
  );
}
