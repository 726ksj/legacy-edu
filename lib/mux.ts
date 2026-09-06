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

// createDirectUpload에서 static_renditions로 요청하는 해상도와 맞춰뒀다 -
// "highest"를 요청하면 Mux가 이 이름으로 파일을 만든다.
const MP4_RENDITION_NAME = "highest.mp4";

// mp4(static rendition)는 asset 본체가 ready된 뒤에도 한동안 더 걸려
// 준비된다. static_renditions를 애초에 요청하지 않은(이 기능 이전에
// 업로드된) 오래된 lesson들까지 매번 다시 물어보는 낭비를 막기 위해,
// 생성된 지 이 시간 안쪽인 lesson만 재확인한다 - 80분짜리 영상도 이
// 안에 충분히 끝난다.
const MP4_READY_CHECK_WINDOW_MS = 24 * 60 * 60 * 1000;

interface Mp4CheckableLesson {
  id: string;
  mux_asset_id: string | null;
  mp4_ready: boolean;
  created_at: string;
}

// mp4 준비가 끝났으면 DB에 캐시해두고 true를 반환한다. 이미 캐시돼 있으면
// Mux를 다시 조회하지 않는다.
export async function ensureMp4Ready(
  supabase: SupabaseClient,
  lesson: Mp4CheckableLesson,
): Promise<boolean> {
  if (lesson.mp4_ready) return true;
  if (!lesson.mux_asset_id) return false;
  if (Date.now() - new Date(lesson.created_at).getTime() > MP4_READY_CHECK_WINDOW_MS) {
    return false;
  }

  try {
    const mux = createMuxClient();
    const asset = await mux.video.assets.retrieve(lesson.mux_asset_id);
    // static_renditions 자체에는 종합 status 필드가 없다 - 우리가 요청한
    // 해상도(highest)의 파일 하나를 찾아 그 파일의 status를 봐야 한다.
    const file = asset.static_renditions?.files?.find(
      (f) => f.name === MP4_RENDITION_NAME,
    );
    if (file?.status !== "ready") return false;

    await supabase.from("lessons").update({ mp4_ready: true }).eq("id", lesson.id);
    return true;
  } catch {
    // 일시적 오류일 수 있음 - 다음 새로고침에 재시도
    return false;
  }
}

export function buildMp4Url(playbackId: string, token: string) {
  return `https://stream.mux.com/${playbackId}/${MP4_RENDITION_NAME}?token=${token}`;
}
