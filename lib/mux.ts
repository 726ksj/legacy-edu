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

// Mux는 업로드가 끝나도 asset을 바로 만들어주지 않는다 (자기들 문서에도
// "upload가 complete돼야 asset을 만들기 시작한다"고 명시돼 있음). 업로드
// 직후 바로 조회하면 asset_id가 아직 없을 수 있어서, 잠깐 재시도하며
// 기다린다. 그래도 안 나타나면 upload_id만이라도 저장해서 나중에
// syncLessonStatuses가 다시 시도할 수 있게 한다.
export async function pollUploadForAssetId(
  uploadId: string,
  { attempts = 5, delayMs = 1500 }: { attempts?: number; delayMs?: number } = {},
): Promise<string | null> {
  const mux = createMuxClient();

  for (let i = 0; i < attempts; i++) {
    try {
      const upload = await mux.video.uploads.retrieve(uploadId);
      if (upload.asset_id) return upload.asset_id;
      if (upload.status === "errored" || upload.status === "cancelled") {
        return null;
      }
    } catch {
      // 일시적 오류일 수 있음 - 계속 재시도
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

interface SyncableLesson {
  id: string;
  status: string;
  mux_asset_id: string | null;
  mux_upload_id?: string | null;
  mux_playback_id?: string | null;
}

/**
 * Mux processes uploads asynchronously, so a lesson can sit in "preparing"
 * in our DB after the asset is actually ready on Mux's side. Call this
 * wherever lessons are read (admin or student) to reconcile status before
 * rendering, instead of relying on someone revisiting the admin page.
 * (Mux 웹훅이 설정돼 있으면 대부분 웹훅이 먼저 반영하고, 이 함수는 웹훅이
 * 아직 안 왔거나 설정 전인 경우의 안전망 역할을 한다.)
 */
export async function syncLessonStatuses<T extends SyncableLesson>(
  supabase: SupabaseClient,
  lessons: T[],
): Promise<T[]> {
  const preparing = lessons.filter((lesson) => lesson.status === "preparing");
  if (preparing.length === 0) return lessons;

  const mux = createMuxClient();
  for (const lesson of preparing) {
    let assetId = lesson.mux_asset_id;

    // asset_id를 아직 못 받은 차시는 upload_id로 다시 확인해본다
    // (업로드 직후 폴링이 실패했던 경우의 재시도).
    if (!assetId && lesson.mux_upload_id) {
      try {
        const upload = await mux.video.uploads.retrieve(lesson.mux_upload_id);
        if (upload.asset_id) {
          assetId = upload.asset_id;
          await supabase
            .from("lessons")
            .update({ mux_asset_id: assetId })
            .eq("id", lesson.id);
          lesson.mux_asset_id = assetId;
        }
      } catch {
        // 다음 새로고침에 재시도
      }
    }

    if (!assetId) continue;

    try {
      const asset = await mux.video.assets.retrieve(assetId);
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

// 웹훅 payload가 실제로 Mux에서 온 게 맞는지 서명을 검증하고 파싱한다.
// MUX_WEBHOOK_SECRET이 없거나 서명이 안 맞으면 throw한다.
export async function unwrapMuxWebhookEvent(body: string, headers: Headers) {
  const mux = createMuxClient();
  return mux.webhooks.unwrap(body, headers, process.env.MUX_WEBHOOK_SECRET);
}
