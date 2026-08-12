"use client";

import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import {
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SEEK_SECONDS = 10;
const DOUBLE_TAP_MAX_INTERVAL_MS = 300;
const TAP_MOVE_THRESHOLD_PX = 12;
const SEEK_FLASH_DURATION_MS = 650;
const TOUCH_SEEK_GUARD_MS = 500;

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
  prevLessonHref,
  nextLessonHref,
}: {
  playbackId: string;
  token: string;
  title: string;
  prevLessonHref?: string;
  nextLessonHref?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekFlash, setSeekFlash] = useState<{
    side: "left" | "right";
    key: number;
  } | null>(null);

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
  // 확대하지 않은 상태에서 한 손가락 탭 위치/시각을 기억해뒀다가
  // 짧은 시간 안에 같은 자리를 다시 탭하면 더블탭(좌우 10초 이동)으로 판정한다.
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ x: number; time: number } | null>(null);
  // 터치로 더블탭 이동을 처리한 시각을 기록해둔다. 일부 브라우저는
  // touchend에서 preventDefault를 호출해도 뒤이어 합성 dblclick을 쏴서
  // 아래 마우스 dblclick 핸들러가 또 반응해 20초씩 이동하는 문제가
  // 있었다 - 방금 터치로 처리했다면 dblclick은 무조건 무시한다.
  const touchHandledAtRef = useRef(0);
  // 더블탭의 "첫 번째 탭"이 될 수도 있으므로 바로 재생/일시정지를
  // 토글하지 않고, 두 번째 탭이 안 오면 그때 토글한다. (첫 탭에서
  // 곧바로 mux-player 기본 탭 동작이 실행되게 두면, 더블탭으로
  // 시크할 때마다 일시정지 아이콘이 잠깐 겹쳐 보이는 문제가 있었다.)
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const seekFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) player.play();
    else player.pause();
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const duration = Number.isFinite(player.duration) ? player.duration : Infinity;
    player.currentTime = Math.min(
      duration,
      Math.max(0, player.currentTime + deltaSeconds),
    );
  }, []);

  const flashSeek = useCallback((side: "left" | "right") => {
    setSeekFlash((prev) => ({ side, key: (prev?.key ?? 0) + 1 }));
    if (seekFlashTimeoutRef.current) clearTimeout(seekFlashTimeoutRef.current);
    seekFlashTimeoutRef.current = setTimeout(
      () => setSeekFlash(null),
      SEEK_FLASH_DURATION_MS,
    );
  }, []);

  const seekFromTapPosition = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isLeft = clientX - rect.left < rect.width / 2;
      seekBy(isLeft ? -SEEK_SECONDS : SEEK_SECONDS);
      flashSeek(isLeft ? "left" : "right");
    },
    [seekBy, flashSeek],
  );

  useEffect(() => {
    return () => {
      if (seekFlashTimeoutRef.current) clearTimeout(seekFlashTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
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
        tapStartRef.current = null;
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        setIsGesturing(true);
        panRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTranslate: translateRef.current,
        };
      } else if (e.touches.length === 1) {
        tapStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
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
      if (
        tapStartRef.current &&
        scaleRef.current === 1 &&
        e.touches.length === 0 &&
        e.changedTouches.length === 1
      ) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - tapStartRef.current.x;
        const dy = touch.clientY - tapStartRef.current.y;
        if (Math.hypot(dx, dy) < TAP_MOVE_THRESHOLD_PX) {
          // 탭을 인식한 이상 mux-player의 기본 탭 동작(재생/일시정지
          // 토글)에 항상 맡기지 않고 우리가 직접 처리한다. 그렇지
          // 않으면 더블탭의 "첫 번째 탭"에서 곧바로 일시정지가
          // 걸리면서 그 아이콘이 우리 10초 이동 표시와 겹쳐 보인다.
          e.preventDefault();
          const now = Date.now();
          if (
            lastTapRef.current &&
            now - lastTapRef.current.time < DOUBLE_TAP_MAX_INTERVAL_MS
          ) {
            // 더블탭 완성: 예약해둔 첫 탭의 재생/일시정지 토글은 취소한다.
            if (singleTapTimeoutRef.current) {
              clearTimeout(singleTapTimeoutRef.current);
              singleTapTimeoutRef.current = null;
            }
            touchHandledAtRef.current = Date.now();
            seekFromTapPosition(touch.clientX);
            lastTapRef.current = null;
          } else {
            // 아직은 싱글탭일 수도, 더블탭의 첫 탭일 수도 있다. 더블탭
            // 인식 시간(300ms) 안에 두 번째 탭이 안 오면 그때 가서
            // 재생/일시정지를 토글한다.
            lastTapRef.current = { x: touch.clientX, time: now };
            if (singleTapTimeoutRef.current) {
              clearTimeout(singleTapTimeoutRef.current);
            }
            singleTapTimeoutRef.current = setTimeout(() => {
              singleTapTimeoutRef.current = null;
              togglePlayPause();
            }, DOUBLE_TAP_MAX_INTERVAL_MS);
          }
        }
      }
      tapStartRef.current = null;
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length < 1) panRef.current = null;
      if (e.touches.length === 0) setIsGesturing(false);
    }

    // 데스크톱에서도 더블클릭으로 10초 이동을 지원한다. capture 단계에서
    // 가로채 stopPropagation하지 않으면 mux-player 자체의 더블클릭 핸들러가
    // 함께 반응할 수 있다. 방금 터치 더블탭으로 이미 처리했다면(모바일
    // 브라우저가 뒤이어 합성 dblclick을 쐈을 뿐이므로) 여기서는 무시한다.
    function handleDoubleClick(e: MouseEvent) {
      if (scaleRef.current > 1) return;
      if (Date.now() - touchHandledAtRef.current < TOUCH_SEEK_GUARD_MS) return;
      e.stopPropagation();
      seekFromTapPosition(e.clientX);
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);
    el.addEventListener("dblclick", handleDoubleClick, { capture: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("dblclick", handleDoubleClick, { capture: true });
    };
  }, [applyScale, clampTranslate, seekFromTapPosition, togglePlayPause]);

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
            className={isFullscreen ? "h-full w-full" : "aspect-video w-full"}
          />
        </div>
      </div>

      {seekFlash && (
        <div
          key={seekFlash.key}
          className={`pointer-events-none absolute inset-y-0 z-10 flex w-1/2 items-center justify-center ${
            seekFlash.side === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="animate-seek-flash flex flex-col items-center gap-1 rounded-full bg-black/60 px-5 py-4 text-white">
            {seekFlash.side === "left" ? (
              <RotateCcw className="h-6 w-6" />
            ) : (
              <RotateCw className="h-6 w-6" />
            )}
            <span className="text-xs font-semibold">{SEEK_SECONDS}초</span>
          </div>
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {prevLessonHref && (
          <Link
            href={prevLessonHref}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
            aria-label="이전 강의"
          >
            <SkipBack className="h-4 w-4" />
          </Link>
        )}
        {nextLessonHref && (
          <Link
            href={nextLessonHref}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
            aria-label="다음 강의"
          >
            <SkipForward className="h-4 w-4" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
          aria-label={isFullscreen ? "전체화면 종료" : "전체화면"}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
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
