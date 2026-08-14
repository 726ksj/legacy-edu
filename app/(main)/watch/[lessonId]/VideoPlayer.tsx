"use client";

import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
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
const TAP_MOVE_THRESHOLD_PX = 12;
const CONTROLS_AUTO_HIDE_MS = 3000;
// touchend 처리 직후 브라우저가 뒤이어 쏘는 합성 click을 또 처리하지
// 않도록 무시하는 시간 (모바일에서 터치가 click으로 한 번 더 들어옴).
const TOUCH_CLICK_GUARD_MS = 500;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function getTouchDistance(touches: TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// mux-player는 자기 자신의 컨트롤(볼륨/자막/화질 등) 버튼을 눌렀을 때도
// 이벤트가 media-controller까지 버블링되므로, e.target만으로는 "영상 자체를
// 탭한 것"과 "버튼을 탭한 것"을 구분할 수 없다(shadow DOM 밖에서는 target이
// 항상 <mux-player>로 재타겟팅됨). composedPath()의 가장 안쪽 요소로 실제
// 클릭된 지점을 확인한다 - mux-player 내부 gesture 처리기도 같은 방식으로
// "video"/"media-controller"인지를 검사해 순수 영상 탭만 골라낸다.
function isPlainVideoSurfaceTarget(e: Event): boolean {
  const innermost = e.composedPath()[0];
  if (!(innermost instanceof Element)) return false;
  return innermost.localName === "video" || innermost.localName === "media-controller";
}

export default function VideoPlayer({
  playbackId,
  token,
  title,
  poster,
  prevLessonHref,
  nextLessonHref,
}: {
  playbackId: string;
  token: string;
  title: string;
  poster?: string;
  prevLessonHref?: string;
  nextLessonHref?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  // 넷플릭스 스타일 중앙 컨트롤(-10 / 재생·일시정지 / +10) 노출 여부.
  // mux-player 자체 중앙 버튼은 globals.css에서 항상 숨기고, 이 버튼들로
  // 완전히 대체한다.
  const [controlsVisible, setControlsVisible] = useState(false);

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
  // 확대하지 않은 상태에서 한 손가락 탭 시작 위치를 기억해뒀다가, 손을 뗄 때
  // 크게 움직이지 않았으면 "탭"으로 인정한다(스크롤/드래그와 구분).
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchHandledAtRef = useRef(0);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
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

  const seekBy = useCallback((deltaSeconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const duration = Number.isFinite(player.duration) ? player.duration : Infinity;
    player.currentTime = Math.min(
      duration,
      Math.max(0, player.currentTime + deltaSeconds),
    );
  }, []);

  const clearAutoHideTimer = useCallback(() => {
    if (controlsHideTimeoutRef.current) {
      clearTimeout(controlsHideTimeoutRef.current);
      controlsHideTimeoutRef.current = null;
    }
  }, []);

  // 재생 중일 때만 일정 시간 후 자동으로 숨긴다. 일시정지 중에는 계속
  // 보여줘야 다시 재생할 방법이 사라지지 않는다.
  const scheduleAutoHide = useCallback(
    (paused: boolean) => {
      clearAutoHideTimer();
      if (paused) return;
      controlsHideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, CONTROLS_AUTO_HIDE_MS);
    },
    [clearAutoHideTimer],
  );

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => {
      const next = !prev;
      if (next) {
        scheduleAutoHide(playerRef.current?.paused ?? true);
      } else {
        clearAutoHideTimer();
      }
      return next;
    });
  }, [scheduleAutoHide, clearAutoHideTimer]);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const wasPaused = player.paused;
    if (wasPaused) {
      player.play();
    } else {
      player.pause();
    }
    scheduleAutoHide(!wasPaused);
  }, [scheduleAutoHide]);

  const seekAndKeepControls = useCallback(
    (deltaSeconds: number) => {
      seekBy(deltaSeconds);
      scheduleAutoHide(playerRef.current?.paused ?? true);
    },
    [seekBy, scheduleAutoHide],
  );

  useEffect(() => {
    return () => {
      clearAutoHideTimer();
    };
  }, [clearAutoHideTimer]);

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
        if (
          Math.hypot(dx, dy) < TAP_MOVE_THRESHOLD_PX &&
          isPlainVideoSurfaceTarget(e)
        ) {
          // 순수 영상 영역 탭 확정: 우리 넷플릭스식 컨트롤만 토글한다.
          // mux-player 자체의 재생/정지 토글(데스크톱 클릭 시 발생)이나
          // 컨트롤 표시 토글(모바일 pointerup)과는 겹치지 않도록 막는다.
          e.preventDefault();
          e.stopPropagation();
          touchHandledAtRef.current = Date.now();
          toggleControls();
        }
      }
      tapStartRef.current = null;
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length < 1) panRef.current = null;
      if (e.touches.length === 0) setIsGesturing(false);
    }

    // 데스크톱 클릭. capture 단계에서 가로채 stopPropagation하지 않으면
    // mux-player 자체의 "클릭하면 재생/정지" 제스처가 같이 반응해서, 컨트롤을
    // 열어보려는 탭만으로도 영상이 멈춰버린다. 순수 영상 영역 클릭일 때만
    // 가로채고, 버튼(자막/볼륨/화질 등) 클릭은 그대로 mux-player가 처리하게
    // 둔다.
    function handleClick(e: MouseEvent) {
      if (scaleRef.current > 1) return;
      if (Date.now() - touchHandledAtRef.current < TOUCH_CLICK_GUARD_MS) return;
      if (!isPlainVideoSurfaceTarget(e)) return;
      e.stopPropagation();
      toggleControls();
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);
    el.addEventListener("click", handleClick, { capture: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("click", handleClick, { capture: true });
    };
  }, [applyScale, clampTranslate, toggleControls]);

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
            poster={poster}
            streamType="on-demand"
            metadata={{ video_title: title }}
            defaultHiddenCaptions
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
            className={isFullscreen ? "h-full w-full" : "aspect-video w-full"}
          />
        </div>
      </div>

      {controlsVisible && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => seekAndKeepControls(-SEEK_SECONDS)}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={`${SEEK_SECONDS}초 뒤로`}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={togglePlayPause}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={isPaused ? "재생" : "일시정지"}
          >
            {isPaused ? (
              <Play className="h-7 w-7" />
            ) : (
              <Pause className="h-7 w-7" />
            )}
          </button>
          <button
            type="button"
            onClick={() => seekAndKeepControls(SEEK_SECONDS)}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={`${SEEK_SECONDS}초 앞으로`}
          >
            <RotateCw className="h-5 w-5" />
          </button>
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
