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

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function getTouchDistance(touches: TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// mux-player는 데스크톱에서 영상을 클릭하면(터치는 해당 없음) 자체적으로
// 재생/일시정지를 토글한다. 우리 중앙 컨트롤을 열어보려는 클릭 한 번에도
// 이게 같이 발동해서, 컨트롤을 펼치기만 해도 영상이 멈춰버린다. 순수 영상
// 영역 클릭일 때만 이 토글이 먹지 않도록 막고, 자막/볼륨 등 mux 자체
// 버튼 클릭은 그대로 mux-player가 처리하게 둔다. composedPath()의 가장
// 안쪽 요소로 확인하는 이유는 shadow DOM 밖에서는 target이 항상
// <mux-player>로 재타겟팅돼 버튼 클릭과 구분이 안 되기 때문이다.
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
  // mux-player가 "사용자 비활성"으로 판단했는지 여부. mux-player 자신의
  // 하단 컨트롤 바와 같은 타이밍에 나타났다 사라지게 하기 위해, 우리가
  // 따로 탭을 감지해서 토글하지 않고 mux-player가 쏘는 userinactivechange
  // 이벤트를 그대로 반영한다(아래 useEffect 참고) - 둘 다 같은 신호를
  // 보는 셈이라 항상 같이 움직인다.
  const [mediaInactive, setMediaInactive] = useState(false);
  // mux-player는 일시정지 중엔 userinactive여도 자기 컨트롤을 CSS로 계속
  // 보여준다(재생 중에만 자동 숨김). 우리 넷플릭스식 컨트롤도 똑같은
  // 규칙을 따라야 진짜로 같이 움직인다.
  const controlsVisible = isPaused || !mediaInactive;

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

  // 우리 중앙 컨트롤 버튼(-10/재생·일시정지/+10)은 mux-player DOM 바깥에
  // 있어서 눌러도 mux-player 자신은 "사용자가 조작 중"이라는 걸 모른다.
  // 그 상태로 두면 mux-player의 자동 숨김 타이머(기본 2초)가 우리 버튼
  // 조작과 무관하게 계속 돌아가다가, 하필 버튼을 누른 순간과 겹쳐서
  // "누르면 사라진다"처럼 보인다. mux-player 내부의 media-controller에
  // 직접 pointermove를 흉내내 활동을 알려주면, mux-player 자신의 로직이
  // 컨트롤을 계속 보여주다가 정해진 시간(기본 2초) 후 자동으로 숨긴다 -
  // 우리 컨트롤은 여전히 그 상태를 그대로 반영만 하므로 항상 같이 움직인다.
  const pokeMuxActivity = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const mediaController = player.shadowRoot
        ?.querySelector("media-theme")
        ?.shadowRoot?.querySelector("media-controller");
      mediaController?.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
        }),
      );
    } catch {
      // mux-player 내부 구조가 바뀌어 위 경로를 못 찾아도 조용히 무시한다 -
      // 이건 "컨트롤을 계속 보여주는" 부가 동작일 뿐, 탐색/재생 자체는
      // 영향받지 않는다.
    }
  }, []);

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      const player = playerRef.current;
      if (!player) return;
      const duration = Number.isFinite(player.duration) ? player.duration : Infinity;
      player.currentTime = Math.min(
        duration,
        Math.max(0, player.currentTime + deltaSeconds),
      );
      pokeMuxActivity();
    },
    [pokeMuxActivity],
  );

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
    pokeMuxActivity();
  }, [pokeMuxActivity]);

  // mux-player 자신의 하단 컨트롤 바는 자체적으로 탭/호버에 따라 표시·자동
  // 숨김을 관리한다(일시정지 중엔 안 숨는 것까지 포함). 우리 중앙 컨트롤을
  // 별도 타이머로 독립적으로 열고 닫으면 서로 다른 타이밍에 나타났다
  // 사라져 따로 노는 것처럼 보이므로, mux-player가 상태를 바꿀 때마다
  // 쏘는 userinactivechange 이벤트를 그대로 반영해 항상 같이 움직이게 한다.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    function handleUserInactiveChange(e: Event) {
      setMediaInactive(Boolean((e as CustomEvent<boolean>).detail));
    }

    player.addEventListener("userinactivechange", handleUserInactiveChange);
    return () => {
      player.removeEventListener("userinactivechange", handleUserInactiveChange);
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

    // capture 단계에서 가로채 stopPropagation하지 않으면 mux-player 자체의
    // click 리스너(media-gesture-receiver)까지 이벤트가 전달돼 재생/일시정지가
    // 같이 토글된다. pointerup 기반 컨트롤 표시/숨김 동기화와는 별개의
    // 이벤트라 여기서 막아도 그쪽엔 영향이 없다.
    function handleClick(e: MouseEvent) {
      if (scaleRef.current > 1) return;
      if (!isPlainVideoSurfaceTarget(e)) return;
      e.stopPropagation();
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
            onClick={() => seekBy(-SEEK_SECONDS)}
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
            onClick={() => seekBy(SEEK_SECONDS)}
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
