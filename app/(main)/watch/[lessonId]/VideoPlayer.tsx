"use client";

import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { Maximize, Minimize } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const SKIP_SECONDS = 10;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function getTouchDistance(touches: TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function VideoPlayer({
  playbackId,
  token,
  title,
}: {
  playbackId: string;
  token: string;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Mux 플레이어 기본 컨트롤이 좁은 화면에서 10초 이동/배속 버튼을 숨겨서,
  // 표준 video 엘리먼트 API(currentTime/playbackRate)를 직접 호출하는
  // 우리만의 버튼으로 대체함
  function skip(deltaSeconds: number) {
    const player = playerRef.current;
    if (!player) return;
    const duration = Number.isFinite(player.duration) ? player.duration : Infinity;
    player.currentTime = Math.min(
      duration,
      Math.max(0, player.currentTime + deltaSeconds),
    );
  }

  function cycleRate() {
    const player = playerRef.current;
    if (!player) return;
    const currentIndex = RATE_OPTIONS.indexOf(playbackRate);
    const next = RATE_OPTIONS[(currentIndex + 1) % RATE_OPTIONS.length];
    player.playbackRate = next;
    setPlaybackRate(next);
  }

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    function handleRateChange() {
      if (player) setPlaybackRate(player.playbackRate);
    }
    player.addEventListener("ratechange", handleRateChange);
    return () => player.removeEventListener("ratechange", handleRateChange);
  }, []);

  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(
    null,
  );
  const panRef = useRef<{
    startX: number;
    startY: number;
    startTranslate: { x: number; y: number };
  } | null>(null);

  const clampTranslate = useCallback(
    (t: { x: number; y: number }, s: number) => {
      const el = containerRef.current;
      const maxOffsetRatio = (s - 1) / 2;
      const maxX = el ? el.clientWidth * maxOffsetRatio : 0;
      const maxY = el ? el.clientHeight * maxOffsetRatio : 0;
      return {
        x: Math.min(maxX, Math.max(-maxX, t.x)),
        y: Math.min(maxY, Math.max(-maxY, t.y)),
      };
    },
    [],
  );

  const applyScale = useCallback(
    (next: number) => {
      const clamped = clampScale(next);
      setScale(clamped);
      if (clamped === 1) {
        setTranslate({ x: 0, y: 0 });
      } else {
        setTranslate((prev) => clampTranslate(prev, clamped));
      }
    },
    [clampTranslate],
  );

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      applyScale(scaleRef.current - e.deltaY * 0.01);
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        setIsGesturing(true);
        pinchRef.current = {
          startDistance: getTouchDistance(e.touches),
          startScale: scaleRef.current,
        };
        panRef.current = null;
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        setIsGesturing(true);
        panRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTranslate: translateRef.current,
        };
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const ratio = getTouchDistance(e.touches) / pinchRef.current.startDistance;
        applyScale(pinchRef.current.startScale * ratio);
      } else if (e.touches.length === 1 && panRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panRef.current.startX;
        const dy = e.touches[0].clientY - panRef.current.startY;
        setTranslate(
          clampTranslate(
            {
              x: panRef.current.startTranslate.x + dx,
              y: panRef.current.startTranslate.y + dy,
            },
            scaleRef.current,
          ),
        );
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length < 1) panRef.current = null;
      if (e.touches.length === 0) setIsGesturing(false);
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [applyScale, clampTranslate]);

  // 확대 상태에서 전체화면으로 들어가면 어색해 보이므로 초기화
  useEffect(() => {
    function handleFullscreenChange() {
      if (document.fullscreenElement) resetZoom();
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [resetZoom]);

  // 가짜 전체화면인 동안 배경 스크롤 방지 + Esc로 닫기
  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    e.preventDefault();
    const startTranslate = translate;
    const startX = e.clientX;
    const startY = e.clientY;

    function handleMouseMove(moveEvent: MouseEvent) {
      setTranslate(
        clampTranslate(
          {
            x: startTranslate.x + (moveEvent.clientX - startX),
            y: startTranslate.y + (moveEvent.clientY - startY),
          },
          scaleRef.current,
        ),
      );
    }
    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] flex items-center justify-center bg-black"
          : "relative overflow-hidden rounded-lg bg-black"
      }
    >
      <div
        ref={containerRef}
        className={isFullscreen ? "h-full w-full" : undefined}
        style={{ touchAction: scale > 1 ? "none" : "pan-y" }}
      >
        <div
          onMouseDown={handleMouseDown}
          className={isFullscreen ? "h-full w-full" : undefined}
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transformOrigin: "center center",
            transition: isGesturing ? "none" : "transform 0.15s ease-out",
            cursor: scale > 1 ? "grab" : undefined,
          }}
        >
          <MuxPlayer
            ref={playerRef}
            playbackId={playbackId}
            tokens={{ playback: token }}
            streamType="on-demand"
            metadata={{ video_title: title }}
            defaultHiddenCaptions
            playbackRates={RATE_OPTIONS}
            className={isFullscreen ? "h-full w-full" : "aspect-video w-full"}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsFullscreen((prev) => !prev)}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
        aria-label={isFullscreen ? "전체화면 종료" : "전체화면"}
      >
        {isFullscreen ? (
          <Minimize className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </button>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-white">
        <button
          type="button"
          onClick={() => skip(-SKIP_SECONDS)}
          className="rounded px-2 py-1 text-xs font-semibold hover:bg-white/20"
          aria-label={`${SKIP_SECONDS}초 뒤로`}
        >
          −{SKIP_SECONDS}초
        </button>
        <button
          type="button"
          onClick={cycleRate}
          className="min-w-[2.5rem] rounded px-2 py-1 text-xs font-semibold hover:bg-white/20"
          aria-label="재생 속도"
        >
          {playbackRate}x
        </button>
        <button
          type="button"
          onClick={() => skip(SKIP_SECONDS)}
          className="rounded px-2 py-1 text-xs font-semibold hover:bg-white/20"
          aria-label={`${SKIP_SECONDS}초 앞으로`}
        >
          +{SKIP_SECONDS}초
        </button>
      </div>

      {scale > 1 && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-white">
          <button
            type="button"
            onClick={() => applyScale(scale - 0.5)}
            className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-white/20"
            aria-label="축소"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs font-medium">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => applyScale(scale + 0.5)}
            className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-white/20"
            aria-label="확대"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="ml-1 rounded px-2 py-1 text-xs font-semibold hover:bg-white/20"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
