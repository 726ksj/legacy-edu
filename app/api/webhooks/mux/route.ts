import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { unwrapMuxWebhookEvent } from "@/lib/mux";

export const dynamic = "force-dynamic";

// 관리자 페이지를 열 때마다 Mux에 "이 영상 다 됐어?"를 하나씩 물어보는
// syncLessonStatuses 폴링은 처리 중인 영상이 많을수록 페이지를 느리게
// 만든다. 이 웹훅이 Mux 쪽에서 처리가 끝나는 즉시 알려주므로, 대부분의
// 경우 폴링 없이도 상태가 바로 반영된다 (폴링은 이 웹훅이 아직 설정 전
// 이거나 실패한 경우의 안전망으로 남겨둔다).
async function findLessonId(
  supabase: ReturnType<typeof createAdminClient>,
  assetId: string,
  uploadId: string | undefined,
): Promise<string | null> {
  const { data: byAsset } = await supabase
    .from("lessons")
    .select("id")
    .eq("mux_asset_id", assetId)
    .maybeSingle();

  if (byAsset) return byAsset.id;
  if (!uploadId) return null;

  // saveLesson이 업로드 직후 asset_id를 못 받아서 upload_id만 저장해둔
  // 경우를 대비한 폴백 매칭.
  const { data: byUpload } = await supabase
    .from("lessons")
    .select("id")
    .eq("mux_upload_id", uploadId)
    .maybeSingle();

  return byUpload?.id ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let event;
  try {
    event = await unwrapMuxWebhookEvent(rawBody, request.headers);
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "mux-webhook" } });
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "video.asset.ready" && event.type !== "video.asset.errored") {
    return Response.json({ ok: true });
  }

  const assetId = event.data.id;
  const uploadId = event.data.upload_id;
  const supabase = createAdminClient();
  const lessonId = await findLessonId(supabase, assetId, uploadId);

  if (!lessonId) {
    return Response.json({ ok: true });
  }

  if (event.type === "video.asset.ready") {
    const playbackId = event.data.playback_ids?.[0]?.id ?? null;
    await supabase
      .from("lessons")
      .update({
        status: "ready",
        mux_asset_id: assetId,
        mux_playback_id: playbackId,
        mux_upload_id: null,
      })
      .eq("id", lessonId);
  } else {
    await supabase
      .from("lessons")
      .update({ status: "errored", mux_asset_id: assetId })
      .eq("id", lessonId);
  }

  return Response.json({ ok: true });
}
