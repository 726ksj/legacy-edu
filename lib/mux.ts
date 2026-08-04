import "server-only";
import Mux from "@mux/mux-node";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createMuxClient() {
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
    jwtSigningKey: process.env.MUX_SIGNING_KEY_ID,
    jwtPrivateKey: process.env.MUX_SIGNING_KEY_PRIVATE_KEY,
  });
}

interface SyncableLesson {
  id: string;
  status: string;
  mux_asset_id: string | null;
  mux_playback_id?: string | null;
}

/**
 * Mux processes uploads asynchronously, so a lesson can sit in "preparing"
 * in our DB after the asset is actually ready on Mux's side. Call this
 * wherever lessons are read (admin or student) to reconcile status before
 * rendering, instead of relying on someone revisiting the admin page.
 */
export async function syncLessonStatuses<T extends SyncableLesson>(
  supabase: SupabaseClient,
  lessons: T[],
): Promise<T[]> {
  const preparing = lessons.filter(
    (lesson) => lesson.status === "preparing" && lesson.mux_asset_id,
  );
  if (preparing.length === 0) return lessons;

  const mux = createMuxClient();
  for (const lesson of preparing) {
    try {
      const asset = await mux.video.assets.retrieve(lesson.mux_asset_id!);
      if (asset.status === "ready") {
        const playbackId = asset.playback_ids?.[0]?.id ?? null;
        await supabase
          .from("lessons")
          .update({ status: "ready", mux_playback_id: playbackId })
          .eq("id", lesson.id);
        lesson.status = "ready";
        lesson.mux_playback_id = playbackId;
      } else if (asset.status === "errored") {
        await supabase
          .from("lessons")
          .update({ status: "errored" })
          .eq("id", lesson.id);
        lesson.status = "errored";
      }
    } catch {
      // 아직 Mux에 반영되지 않았을 수 있음 - 다음 새로고침에 재시도
    }
  }

  return lessons;
}

export async function signPlaybackToken(playbackId: string) {
  const mux = createMuxClient();
  return mux.jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: "6h",
  });
}

export async function signThumbnailToken(playbackId: string) {
  const mux = createMuxClient();
  return mux.jwt.signPlaybackId(playbackId, {
    type: "thumbnail",
    expiration: "6h",
  });
}
