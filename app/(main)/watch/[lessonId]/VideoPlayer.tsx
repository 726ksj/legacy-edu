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
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const playPauseButtonRef = useRef<HTMLButtonElement>(null);
  const forwardButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredCenterControl, setHoveredCenterControl] = useState<
    "back" | "playPause" | "forward" | null
  >(null);
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
  // 일시정지 중에 여백(버튼이 아닌 영상 부분)을 탭하면 이 값이 토글된다.
  // 재생이 시작되거나 다시 일시정지되면 항상 false로 리셋해서, 매번
  // 일시정지할 때는 기본적으로 컨트롤이 보이는 상태로 시작한다.
  const [manuallyHidden, setManuallyHidden] = useState(false);
  // mux-player는 일시정지 중엔 userinactive여도 자기 컨트롤을 CSS로 계속
  // 보여준다(재생 중에만 자동 숨김). 우리 넷플릭스식 컨트롤도 재생 중엔
  // 똑같은 규칙을 따라야 진짜로 같이 움직인다. 일시정지 중엔 mux 자신의
  // userinactive 신호 대신 사용자가 직접 여백을 탭해 껐다 켰다 하는
  // manuallyHidden을 따른다.
  const controlsVisible = isPaused ? !manuallyHidden : !mediaInactive;

  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
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
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  // touchend에서 preventDefault를 걸어도 일부 브라우저는 그 뒤에 합성
  // click을 또 쏘는 경우가 있다 - 그 click이 같은 버튼을 두 번(예: 재생 →
  // 다시 일시정지) 누르지 않도록, 방금 touchend로 처리한 시각을 기록해뒀다가
  // click 핸들러에서 짧은 시간 안이면 무시한다.
  const lastTouchHandledAtRef = useRef(0);

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

  // 두 가지 용도로 쓰인다.
  // (1) 확대 컨트롤(우측 하단)만 mux-player 대응 슬롯이 없어 여전히
  // mux-player 바깥의 형제 엘리먼트로 떠 있다. 그 상태에서 마우스가
  // mux-player 표면에서 이 버튼으로 넘어가면 mux-player 쪽에 mouseleave가
  // 발생해 컨트롤이 숨겨지므로, 활동을 흉내내 계속 활성 상태로 붙잡아둔다.
  // (2) 중앙 -10/재생-일시정지/+10 버튼은 pointer-events: none이라 클릭·탭이
  // mux-player 자신에게는 아예 안 보인다 - mux는 자기 화면에서 실제로
  // 뭔가 눌렸다는 걸 전혀 모르는 채 독립적으로 2초 비활성 타이머를 돌리고
  // 있다가, 하필 우리 버튼을 누른 직후에 그 타이머가 만료되면 방금 조작한
  // 컨트롤 전체가 눈앞에서 사라져 버린다. seekBy/togglePlayPause 안에서도
  // 이 함수를 호출해 "우리 쪽에서 방금 조작이 있었다"를 mux에게 알려줘야
  // 타이머가 그 시점부터 다시 시작된다.
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
  // 중앙 컨트롤이 이제 pointer-events: none이라 mux 쪽 히트테스트에
  // 전혀 관여하지 않으므로, 더 이상 디바운스 없이 그대로 반영해도 안전하다.
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
        tapStartRef.current = null;
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        setIsGesturing(true);
        panRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTranslate: translateRef.current,
        };
        tapStartRef.current = null;
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
      } else if (e.touches.length === 1 && tapStartRef.current) {
        // 스크롤/스와이프처럼 손가락이 실제로 움직인 경우까지 탭으로
        // 오인해 버튼을 누르면 안 되므로, 일정 거리 이상 움직이면 탭
        // 후보에서 제외한다.
        const dx = e.touches[0].clientX - tapStartRef.current.x;
        const dy = e.touches[0].clientY - tapStartRef.current.y;
        if (Math.hypot(dx, dy) > 10) tapStartRef.current = null;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length < 1) panRef.current = null;
      if (e.touches.length === 0) setIsGesturing(false);

      // iOS Safari는 pointer-events: none을 통과해 그 아래(mux-player)에
      // 떨어진 탭에 대해 합성 click 이벤트를 안정적으로 만들어주지 않는다
      // (버튼/링크처럼 원래 클릭 가능한 요소가 아니면 특히 그렇다). click에
      // 기대는 대신 touchend에서 직접 탭 여부(스크롤/스와이프가 아니었는지)를
      // 판정해 버튼 좌표와 겹치면 처리하고, 뒤이어 합성될 수도 있는 click이
      // 같은 동작을 중복 실행하지 않도록 preventDefault로 막는다.
      if (
        e.touches.length === 0 &&
        tapStartRef.current &&
        scaleRef.current === 1 &&
        e.changedTouches.length > 0
      ) {
        const touch = e.changedTouches[0];
        const centerControl = getCenterControlAt(touch.clientX, touch.clientY);
        if (centerControl) {
          e.preventDefault();
          lastTouchHandledAtRef.current = Date.now();
          if (centerControl === "back") seekBy(-SEEK_SECONDS);
          else if (centerControl === "forward") seekBy(SEEK_SECONDS);
          else togglePlayPause();
        } else if (
          isPausedRef.current &&
          isPlainVideoSurfacePoint(touch.clientX, touch.clientY)
        ) {
          // 일시정지 중 여백(버튼도 아니고 우측 상단 이전/다음·전체화면
          // 버튼도 아닌 순수 영상 부분)을 탭하면 중앙 컨트롤을 껐다 켰다
          // 토글한다.
          e.preventDefault();
          lastTouchHandledAtRef.current = Date.now();
          setManuallyHidden((prev) => !prev);
        }
      }
      tapStartRef.current = null;
    }

    // 중앙 -10/재생-일시정지/+10 버튼은 pointer-events: none이라 실제 마우스
    // 클릭은 이 버튼들을 그냥 통과해 mux-player 표면에 떨어진다(왜 그렇게
    // 만들었는지는 위 pokeMuxActivity 주석 참고). 그래서 클릭 좌표가 버튼의
    // 현재 위치와 겹치는지 직접 계산해서 대신 처리해준다.
    function getCenterControlAt(
      x: number,
      y: number,
    ): "back" | "playPause" | "forward" | null {
      const entries: [
        "back" | "playPause" | "forward",
        React.RefObject<HTMLButtonElement | null>,
      ][] = [
        ["back", backButtonRef],
        ["playPause", playPauseButtonRef],
        ["forward", forwardButtonRef],
      ];
      for (const [name, ref] of entries) {
        const btn = ref.current;
        if (!btn) continue;
        const r = btn.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return name;
        }
      }
      return null;
    }

    // 우측 상단 이전/다음 강의·전체화면 버튼처럼 여전히 pointer-events: auto인
    // 실제 엘리먼트를 탭한 게 아니라, 순수 영상(mux-player) 자체가 그 좌표의
    // 대상인지 확인한다. 중앙 -10/재생-일시정지/+10 버튼도 pointer-events:
    // none이라 이 판정에서는 걸리지 않는다(그래서 그 버튼들은 getCenterControlAt로
    // 먼저 따로 걸러낸다).
    function isPlainVideoSurfacePoint(x: number, y: number): boolean {
      const el = document.elementFromPoint(x, y);
      return el?.tagName === "MUX-PLAYER";
    }

    // capture 단계에서 가로채 stopPropagation하지 않으면 mux-player 자체의
    // click 리스너(media-gesture-receiver)까지 이벤트가 전달돼 재생/일시정지가
    // 같이 토글된다. pointerup 기반 컨트롤 표시/숨김 동기화와는 별개의
    // 이벤트라 여기서 막아도 그쪽엔 영향이 없다.
    function handleClick(e: MouseEvent) {
      if (scaleRef.current > 1) return;
      if (Date.now() - lastTouchHandledAtRef.current < 500) return;

      const centerControl = getCenterControlAt(e.clientX, e.clientY);
      if (centerControl) {
        e.stopPropagation();
        e.preventDefault();
        if (centerControl === "back") seekBy(-SEEK_SECONDS);
        else if (centerControl === "forward") seekBy(SEEK_SECONDS);
        else togglePlayPause();
        return;
      }

      if (!isPlainVideoSurfaceTarget(e)) return;
      e.stopPropagation();
      // 일시정지 중 여백을 클릭하면(데스크톱) 마찬가지로 중앙 컨트롤을
      // 껐다 켰다 토글한다. 터치는 위 handleTouchEnd에서 이미 처리하고
      // lastTouchHandledAtRef로 막아뒀으니 여기서는 마우스 클릭만 해당된다.
      if (isPausedRef.current) {
        setManuallyHidden((prev) => !prev);
      }
    }

    function handleMouseMove(e: MouseEvent) {
      setHoveredCenterControl(getCenterControlAt(e.clientX, e.clientY));
    }

    function handleMouseLeave() {
      setHoveredCenterControl(null);
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);
    el.addEventListener("click", handleClick, { capture: true });
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("click", handleClick, { capture: true });
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [applyScale, clampTranslate, seekBy, togglePlayPause]);

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
            disablePictureInPicture
            onPlay={() => {
              setIsPaused(false);
              setManuallyHidden(false);
            }}
            onPause={() => {
              setIsPaused(true);
              setManuallyHidden(false);
            }}
            className={isFullscreen ? "h-full w-full" : "aspect-video w-full"}
          />
        </div>
      </div>

      {controlsVisible && (
        // 이 레이어 전체와 버튼들은 pointer-events: none이다. mux-player 위에
        // 얹힌 형제 엘리먼트가 실제로 마우스 이벤트를 가로채면, 커서가
        // 버튼으로 넘어가는 순간 mux-player 표면 기준 히트테스트 대상이
        // 바뀌어 mux 쪽에 mouseleave가 발생하고, mux가 컨트롤을 숨기면 이
        // 버튼도 같이 사라져 그 자리에 mux 표면이 다시 드러나 pointermove로
        // 오인되어 재활성화되기를 반복한다 - 실측 결과 이 진동이 15~100ms
        // 간격으로 10초 넘게 끊임없이 이어질 수 있었다(느슨한 poke/디바운스
        // 로는 못 따라잡는 속도). 아예 버튼을 히트테스트에서 완전히 빼서
        // (pointer-events: none) mux 표면이 항상 그대로 클릭 대상으로
        // 남게 하고, 실제 클릭/호버 판정은 아래 컨테이너의 클릭 핸들러가
        // 버튼의 현재 위치와 좌표를 직접 비교해서 처리한다 - 키보드
        // 접근성을 위해 onClick은 남겨둔다(포커스 후 Enter/Space는
        // pointer-events와 무관하게 동작한다).
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-6">
          <button
            ref={backButtonRef}
            type="button"
            onClick={() => seekBy(-SEEK_SECONDS)}
            className={`pointer-events-none flex h-11 w-11 items-center justify-center rounded-full text-white ${
              hoveredCenterControl === "back" ? "bg-black/80" : "bg-black/60"
            }`}
            aria-label={`${SEEK_SECONDS}초 뒤로`}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            ref={playPauseButtonRef}
            type="button"
            onClick={togglePlayPause}
            className={`pointer-events-none flex h-14 w-14 items-center justify-center rounded-full text-white ${
              hoveredCenterControl === "playPause" ? "bg-black/80" : "bg-black/60"
            }`}
            aria-label={isPaused ? "재생" : "일시정지"}
          >
            {isPaused ? (
              <Play className="h-7 w-7" />
            ) : (
              <Pause className="h-7 w-7" />
            )}
          </button>
          <button
            ref={forwardButtonRef}
            type="button"
            onClick={() => seekBy(SEEK_SECONDS)}
            className={`pointer-events-none flex h-11 w-11 items-center justify-center rounded-full text-white ${
              hoveredCenterControl === "forward" ? "bg-black/80" : "bg-black/60"
            }`}
            aria-label={`${SEEK_SECONDS}초 앞으로`}
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      )}

      <div
        className="absolute right-3 top-3 z-10 flex items-center gap-2"
        onMouseEnter={pokeMuxActivity}
      >
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
        <div
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-white"
          onMouseEnter={pokeMuxActivity}
        >
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
