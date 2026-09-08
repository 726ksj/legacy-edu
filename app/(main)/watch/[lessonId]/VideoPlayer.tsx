"use client";

import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type ShakaNamespace from "shaka-player/dist/shaka-player.compiled";
import { saveLessonProgress } from "./progress-actions";

type ShakaPlayer = InstanceType<typeof ShakaNamespace.Player>;

const PROGRESS_REPORT_INTERVAL_MS = 15000;
// 멈춘 걸 얼마나 빨리 알아채는지가 곧 "얼마나 티가 안 나게 복구되는지"를
// 정한다 - 짧을수록 사용자는 잠깐의 버벅임 정도로만 느낀다. 단, 이건
// "한 번이라도 실제로 재생이 시작된 뒤" 기준이고, 로드 직후 최초
// 버퍼링 구간에는 훨씬 넉넉한 INITIAL_LOAD_GRACE_MS를 대신 적용한다 -
// 그렇지 않으면 아직 버퍼링 중인 정상 상황을 "멈췄다"고 오판해서
// 재시작 → 다시 버퍼링 → 또 오판을 반복하며 계속 처음으로 돌아가 버린다.
const STALL_TIMEOUT_MS = 3000;
const INITIAL_LOAD_GRACE_MS = 15000;
const STALL_CHECK_INTERVAL_MS = 1000;
// 멈춤이 감지되면 우선 플레이어를 다시 붙여서 같은 위치부터 자동으로
// 이어 재생을 시도한다. 이 시도가 짧은 시간 안에 반복해서 실패하면(즉,
// 재시작해도 곧바로 다시 멈추면) 재시작으로 해결되는 문제가 아니라고
// 보고 그때 가서야 새로고침 안내를 띄운다.
const MAX_AUTO_RECOVERY_ATTEMPTS = 3;
const RECOVERY_ATTEMPT_RESET_MS = 60000;

// Shaka 기본값보다 버퍼를 더 넉넉히 들고, 매니페스트/세그먼트 재시도
// 횟수를 늘려서 일시적인 네트워크 지연 정도로는 재생을 포기하는 상황
// 자체가 덜 생기게 한다.
const SHAKA_CONFIG = {
  streaming: {
    bufferingGoal: 60,
    rebufferingGoal: 2,
    retryParameters: { maxAttempts: 10, baseDelay: 1000 },
  },
  manifest: {
    retryParameters: { maxAttempts: 5, baseDelay: 1000 },
  },
};

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SEEK_SECONDS = 10;
// 재생 중 이 시간(ms) 동안 마우스/터치 움직임이 없으면 컨트롤을 숨긴다.
const INACTIVITY_TIMEOUT_MS = 2000;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function getTouchDistance(touches: TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoPlayer({
  playbackId,
  token: tokenProp,
  src: srcProp,
  title,
  poster,
  lessonId,
  prevLessonHref,
  nextLessonHref,
}: {
  playbackId: string;
  token: string;
  // 최고화질 mp4(static rendition)가 준비돼 있으면 서버 컴포넌트가 이걸
  // 채워준다 - 적응형 스트리밍(HLS) 자체를 안 거치게 돼서, 재생 라이브러리
  // 내부 복구 로직이 조용히 실패하는 문제를 구조적으로 피할 수 있다.
  // 없으면 Shaka Player로 HLS(playbackId+token) 재생한다.
  src?: string;
  title: string;
  poster?: string;
  lessonId: string;
  prevLessonHref?: string;
  nextLessonHref?: string;
}) {
  // 시청 진도 저장(saveLessonProgress) 같은 Server Action이 끝날 때마다
  // Next.js가 이 페이지의 서버 컴포넌트를 다시 그리면서 재생 토큰을 매번
  // 새로 발급해준다 - 토큰 자체는 6시간 유효해서 다시 받을 필요가 없는데,
  // 이 값(과 이걸 담은 src)이 prop으로 바뀔 때마다 그대로 반응해서
  // 플레이어/영상 엘리먼트를 다시 로드하면, 일시정지하거나 탐색할 때마다
  // (둘 다 진도 저장을 유발한다) 재생 중이던 영상이 처음으로 리셋돼버린다.
  // 마운트 시점의 값만 고정해서 쓰고, 이후 prop이 바뀌어도 무시한다.
  const [token] = useState(tokenProp);
  const [src] = useState(srcProp);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shakaPlayerRef = useRef<ShakaPlayer | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  // 브라우저 기본(native) 컨트롤 대신 직접 그리는 재생바에 쓴다. iOS
  // Safari에서 native controls의 전체화면 버튼을 쓰면 영상이 OS 차원의
  // 별도 전체화면 레이어로 빠져나가 버려서, 우리 중앙 컨트롤·확대(zoom)
  // 오버레이가 전부 어긋나거나 아예 안 먹히는 문제가 있었다 - 그래서
  // native controls를 아예 안 쓰고 재생바를 직접 그린다.
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isSeekDragging, setIsSeekDragging] = useState(false);
  // 재생 토큰은 6시간 후 만료된다(lib/mux.ts) - 그 시점을 넘겨 재생/탐색을
  // 시도하면 Mux가 401/403으로 거절하며 error 이벤트가 뜬다. 원인을 세세히
  // 구분하는 대신, 에러가 나면 새로고침을 안내한다(새로고침하면 서버
  // 컴포넌트가 새 토큰을 발급한다).
  const [playbackError, setPlaybackError] = useState(false);
  // 간헐적인 네트워크 문제나 재생 라이브러리 내부 복구 실패로 완전히
  // 멈춰버리는 경우가 있다 - 이때는 error/waiting 이벤트가 전혀 안 뜨는
  // 경우도 있어서, 특정 이벤트에 기대는 대신 재생 중인데 currentTime
  // 자체가 일정 시간 안 움직이면 원인과 무관하게 멈춘 것으로 간주한다.
  // 이때 바로 사용자에게 새로고침을 요구하는 대신, 같은 위치로 이동해서
  // 자동 복구를 먼저 시도한다 - 아래 MAX_AUTO_RECOVERY_ATTEMPTS 참고.
  const [stalled, setStalled] = useState(false);
  // 재생 중 일정 시간 조작이 없으면 컨트롤을 숨긴다. 일시정지 중에는
  // 항상 보여준다.
  const [mediaInactive, setMediaInactive] = useState(false);
  const mediaInactiveRef = useRef(mediaInactive);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsVisible = isPaused || !mediaInactive;

  useEffect(() => {
    mediaInactiveRef.current = mediaInactive;
  }, [mediaInactive]);

  // 컨트롤을 보여주고, 일정 시간 뒤 다시 자동으로 숨기는 타이머를 새로
  // 건다. 마우스를 움직이는 등 "계속 보고 있다"는 신호에 쓴다.
  const revealControls = useCallback(() => {
    setMediaInactive(false);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = setTimeout(
      () => setMediaInactive(true),
      INACTIVITY_TIMEOUT_MS,
    );
  }, []);

  // 유튜브처럼, 재생 중 화면을 탭/클릭하면(줌 상태가 아닐 때) 컨트롤을
  // 껐다 켰다 토글한다 - 켜질 때는 자동 숨김 타이머도 같이 다시 건다.
  const toggleControls = useCallback(() => {
    if (mediaInactiveRef.current) {
      revealControls();
    } else {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      setMediaInactive(true);
    }
  }, [revealControls]);

  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  // 마지막으로 재생이 실제로 진행되고 있었던 위치 - 정지 감시와 자동 복구
  // 둘 다 이 값을 기준으로 삼는다.
  const lastProgressRef = useRef({ time: 0, at: 0 });
  const recoveryAttemptsRef = useRef(0);
  const lastRecoveryAtRef = useRef(0);
  // 로드(혹은 복구)한 뒤 실제로 재생이 한 번이라도 시작된 적이 있는지.
  // 새로 로드를 걸 때마다 false로 리셋하고, 브라우저의 playing 이벤트가
  // 뜨면 true로 바꾼다 - 아직 false인 동안은(=최초 버퍼링 중) 빡빡한
  // STALL_TIMEOUT_MS 대신 훨씬 넉넉한 INITIAL_LOAD_GRACE_MS를 적용해서,
  // 정상적인 버퍼링을 멈춤으로 오판하지 않게 한다.
  const playingConfirmedRef = useRef(false);

  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(
    null,
  );
  const panRef = useRef<{
    startX: number;
    startY: number;
    startTranslate: { x: number; y: number };
  } | null>(null);
  // 핀치/팬이 아닌 순수 탭인지 구분한다(유튜브처럼 탭으로 컨트롤을
  // 껐다 켰다 토글하기 위함) - 손가락이 일정 거리 이상 움직이면 탭
  // 후보에서 제외한다.
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  // 터치로 탭을 처리한 직후 브라우저가 합성 click 이벤트를 또 쏘는
  // 경우가 있다 - 그 click이 video의 onClick에서 토글을 한 번 더
  // 실행해서 껐다가 바로 켜지는(또는 그 반대) 깜빡임이 생긴다. 방금
  // touchend로 처리한 시각을 기록해뒀다가 짧은 시간 안의 click은 무시한다.
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

  const seekBy = useCallback((deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
    const nextTime = Math.min(duration, Math.max(0, video.currentTime + deltaSeconds));
    video.currentTime = nextTime;
    // 뒤로 감기(-10초)는 정지 감시 로직 입장에선 "제자리에서 갑자기
    // 과거로 튄" 것과 구분이 안 된다 - 사용자가 직접 탐색한 것이니 여기서
    // 바로 기준점을 갱신해서 오탐(멈춘 것으로 오인)하지 않게 한다.
    lastProgressRef.current = { time: nextTime, at: Date.now() };
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  // 시청 진도를 서버에 저장한다. 되감기로 진도가 줄어드는 건 서버(action)
  // 쪽에서 막아준다 - 여기서는 그냥 현재 위치만 보고한다.
  const reportProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const duration = video.duration;
    const currentTime = video.currentTime;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(currentTime) || currentTime <= 0) return;
    saveLessonProgress(lessonId, currentTime, duration);
  }, [lessonId]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(reportProgress, PROGRESS_REPORT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPaused, reportProgress]);

  useEffect(() => {
    if (isPaused) reportProgress();
  }, [isPaused, reportProgress]);

  useEffect(() => {
    return () => reportProgress();
  }, [reportProgress]);

  const manifestUri = `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;

  // Shaka Player 인스턴스를 새로 만들어 video 엘리먼트에 붙이고 로드한다.
  // resumeAt이 있으면 그 위치부터 시작(Shaka가 공식 지원하는 load()의
  // startTime 인자) 한 뒤 자동으로 이어서 재생한다.
  const createAndLoadShakaPlayer = useCallback(
    async (resumeAt?: number) => {
      const video = videoRef.current;
      if (!video || src) return; // mp4(src) 모드에서는 Shaka를 쓰지 않는다

      playingConfirmedRef.current = false;

      const { default: shaka } = await import(
        "shaka-player/dist/shaka-player.compiled"
      );
      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) {
        throw new Error("Browser not supported by Shaka Player");
      }

      await shakaPlayerRef.current?.destroy().catch(() => {});

      const player = new shaka.Player();
      shakaPlayerRef.current = player;
      player.configure(SHAKA_CONFIG);
      player.addEventListener("error", () => setPlaybackError(true));

      await player.attach(video);
      await player.load(manifestUri, resumeAt);
      if (resumeAt != null) {
        await video.play().catch(() => {});
      }
    },
    [src, manifestUri],
  );

  // 멈춤이 감지됐을 때 바로 사용자에게 새로고침을 요구하지 않고, 먼저
  // 같은 위치로 재생을 다시 붙여서(mp4는 reload+seek, HLS는 Shaka
  // Player를 새로 만들어 load) 자동 재생을 시도한다. 최근
  // RECOVERY_ATTEMPT_RESET_MS 안에 이미 여러 번 시도했는데도 계속
  // 멈춘다면(재시작으로 안 고쳐지는 문제라는 뜻) 그때는 포기하고
  // 새로고침 안내를 띄운다.
  const attemptRecovery = useCallback(() => {
    const now = Date.now();
    if (now - lastRecoveryAtRef.current > RECOVERY_ATTEMPT_RESET_MS) {
      recoveryAttemptsRef.current = 0;
    }

    if (recoveryAttemptsRef.current >= MAX_AUTO_RECOVERY_ATTEMPTS) {
      setStalled(true);
      return;
    }

    recoveryAttemptsRef.current += 1;
    lastRecoveryAtRef.current = now;

    // 멈춘 "그 순간"의 currentTime을 읽는 게 아니라, 감시 로직이 계속
    // 추적해온 "마지막으로 정상 진행이 확인된 위치"를 쓴다. 멈춤의 원인
    // 자체가 내부적으로 재생 위치를 0 등으로 되돌려버릴 수 있어서, 감지
    // 시점의 currentTime을 그대로 믿으면 안 된다.
    const resumeAt = lastProgressRef.current.time;
    lastProgressRef.current = { time: resumeAt, at: now };

    const video = videoRef.current;
    if (!video) return;

    if (src) {
      playingConfirmedRef.current = false;
      const onLoaded = () => {
        video.currentTime = resumeAt;
        video.play().catch(() => {});
        video.removeEventListener("loadedmetadata", onLoaded);
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.load();
    } else {
      createAndLoadShakaPlayer(resumeAt).catch(() => setStalled(true));
    }
  }, [src, createAndLoadShakaPlayer]);

  // 재생 중인데 currentTime이 STALL_TIMEOUT_MS 이상 실제로 안 움직이면
  // 멈춘 것으로 간주한다. 특정 이벤트에 기대는 대신 실제 진행 여부만
  // 본다. 뒤로(과거로) 튀는 움직임은 "진행"으로 치지 않는다 - 멈춤의
  // 원인 자체가 내부적으로 currentTime을 0 등으로 되돌려버리는 경우가
  // 있는데, 이걸 정상 진행으로 착각하면 정작 복구 위치로 써야 할 "마지막
  // 정상 위치" 기록이 그 잘못된 값으로 덮어써진다. 사용자가 직접
  // 되감기(seekBy)한 경우는 그쪽에서 별도로 기준점을 갱신해준다.
  useEffect(() => {
    if (isPaused) return;

    lastProgressRef.current = {
      time: videoRef.current?.currentTime ?? 0,
      at: Date.now(),
    };

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const currentTime = video.currentTime;
      const now = Date.now();

      if (currentTime > lastProgressRef.current.time + 0.25) {
        lastProgressRef.current = { time: currentTime, at: now };
        return;
      }

      const timeout = playingConfirmedRef.current
        ? STALL_TIMEOUT_MS
        : INITIAL_LOAD_GRACE_MS;
      if (now - lastProgressRef.current.at >= timeout) {
        attemptRecovery();
      }
    }, STALL_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPaused, attemptRecovery]);

  // mp4(src)가 있으면 hls 재생 라이브러리를 아예 안 거치므로 그쪽은
  // native <video src>로 바로 재생한다. 없으면 Shaka Player로 HLS
  // 재생을 초기화한다.
  useEffect(() => {
    if (src) return;
    let cancelled = false;

    createAndLoadShakaPlayer().catch(() => {
      if (!cancelled) setPlaybackError(true);
    });

    return () => {
      cancelled = true;
      shakaPlayerRef.current?.destroy().catch(() => {});
      shakaPlayerRef.current = null;
    };
  }, [src, createAndLoadShakaPlayer]);

  // 재생 중 일정 시간 마우스 조작이 없으면 컨트롤을 숨긴다(데스크톱
  // 호버). 일시정지 중에는 항상 보여준다. 터치는 여기서 다루지 않는다 -
  // 아래 제스처 effect의 탭 감지에서 toggleControls로 명시적으로
  // 켰다/껐다 토글한다(하단 참고, 유튜브 방식).
  useEffect(() => {
    // 일시정지 중엔 controlsVisible이 이미 항상 true라 mediaInactive 값 자체가
    // 안 쓰인다 - 따로 리셋할 필요 없음.
    if (isPaused) return;
    const container = containerRef.current;
    if (!container) return;

    // 터치 탭을 처리한 직후 iOS 사파리가 mousemove도 합성해서 같이 쏜다 -
    // 이걸 그대로 반영하면, 탭으로 방금 숨겼어도 뒤이은 합성 mousemove가
    // 무조건 다시 표시시켜버려서 탭할 때마다 껐다 바로 켜지는 것처럼
    // 깜빡인다. 방금 터치로 처리한 직후의 mousemove는 무시한다.
    function handleMouseMove() {
      if (Date.now() - lastTouchHandledAtRef.current < 500) return;
      revealControls();
    }

    // setState를 effect 본문에서 곧바로(동기적으로) 호출하지 않도록,
    // 최초 타이머 시작도 매크로태스크로 한 틱 미룬다.
    const initialId = setTimeout(revealControls, 0);
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearTimeout(initialId);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isPaused, revealControls]);

  // 핀치 줌 / 두 손가락 밖 확대 상태에서 한 손가락 이동 / Ctrl+휠 확대
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
        const dx = e.touches[0].clientX - tapStartRef.current.x;
        const dy = e.touches[0].clientY - tapStartRef.current.y;
        if (Math.hypot(dx, dy) > 10) tapStartRef.current = null;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length < 1) panRef.current = null;
      if (e.touches.length === 0) setIsGesturing(false);

      if (e.touches.length === 0 && tapStartRef.current && scaleRef.current === 1) {
        lastTouchHandledAtRef.current = Date.now();
        toggleControls();
      }
      tapStartRef.current = null;
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

  const seekBarRef = useRef<HTMLDivElement>(null);

  // 드래그 중인 위치를 클릭 좌표로부터 계산만 하고, 실제 영상
  // currentTime은 아직 건드리지 않는다 - 손을 뗄 때(pointerup) 딱 한
  // 번만 실제로 이동시킨다. 드래그하는 동안 매번 실제 탐색을 걸면 계속
  // 버퍼링을 새로 시도하게 돼서 뚝뚝 끊기는 느낌이 난다.
  function ratioFromClientX(clientX: number): number | null {
    const bar = seekBarRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function handleSeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const total = Number.isFinite(video.duration) ? video.duration : duration;
    if (!Number.isFinite(total) || total <= 0) return;

    setIsSeekDragging(true);
    const ratio = ratioFromClientX(e.clientX);
    if (ratio != null) setCurrentTime(ratio * total);

    function handlePointerMove(moveEvent: PointerEvent) {
      const r = ratioFromClientX(moveEvent.clientX);
      if (r != null) setCurrentTime(r * total);
    }
    function handlePointerUp(upEvent: PointerEvent) {
      if (!video) return;
      const r = ratioFromClientX(upEvent.clientX);
      const target = r != null ? r * total : video.currentTime;
      video.currentTime = target;
      setCurrentTime(target);
      lastProgressRef.current = { time: target, at: Date.now() };
      setIsSeekDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

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
          // scale===1일 때도 항등 transform(scale(1) translate(0px,0px))을
          // 계속 걸어두면 브라우저가 이 레이어를 계속 별도 GPU 합성
          // 레이어로 승격시켜둔다 - 일부 환경에서 영상 디코딩/오디오는
          // 정상 진행되는데 화면 합성만 멈추는 것처럼 보이는 렌더링
          // 문제와 연관될 수 있어서, 확대 중이 아닐 때는 transform 자체를
          // 아예 안 건다.
          style={
            scale === 1
              ? undefined
              : {
                  transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                  transformOrigin: "center center",
                  transition: isGesturing ? "none" : "transform 0.15s ease-out",
                  cursor: "grab",
                }
          }
        >
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            aria-label={title}
            playsInline
            disablePictureInPicture
            onClick={() => {
              // 데스크톱 마우스 클릭 버전 - 터치는 위 제스처 effect의 탭
              // 감지에서 이미 처리했다(브라우저가 터치 뒤에 합성 click도
              // 쏘기 때문에, 방금 터치로 처리했다면 여기서 또 토글하지
              // 않는다). 확대 중엔 드래그(팬)와 혼동될 수 있어 토글하지
              // 않는다.
              if (Date.now() - lastTouchHandledAtRef.current < 500) return;
              if (scaleRef.current === 1) toggleControls();
            }}
            onPlay={() => setIsPaused(false)}
            onPlaying={() => {
              // 실제로 재생(디코딩)이 시작됐다는 뜻 - 이 시점부터는 최초
              // 버퍼링 유예 대신 빡빡한 STALL_TIMEOUT_MS를 적용한다.
              playingConfirmedRef.current = true;
              lastProgressRef.current = {
                time: videoRef.current?.currentTime ?? 0,
                at: Date.now(),
              };
            }}
            onPause={() => setIsPaused(true)}
            onEnded={reportProgress}
            onError={() => setPlaybackError(true)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => {
              // 드래그로 탐색하는 중엔 우리가 이미 위치를 반영해뒀으니,
              // 아직 그 위치를 못 따라온 video의 timeupdate로 덮어쓰지
              // 않는다.
              if (isSeekDragging) return;
              setCurrentTime(e.currentTarget.currentTime);
            }}
            className={
              isFullscreen ? "h-full w-full" : "aspect-video w-full bg-black"
            }
          />
        </div>
      </div>

      {(playbackError || stalled) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-4 text-center">
          <p className="text-sm text-white">
            {playbackError
              ? "재생 세션이 만료됐습니다. 새로고침 후 다시 시도해주세요."
              : "재생이 멈췄습니다. 새로고침 후 다시 시도해주세요."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            새로고침
          </button>
        </div>
      )}

      {!playbackError && !stalled && controlsVisible && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              seekBy(-SEEK_SECONDS);
            }}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={`${SEEK_SECONDS}초 뒤로`}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={isPaused ? "재생" : "일시정지"}
          >
            {isPaused ? <Play className="h-7 w-7" /> : <Pause className="h-7 w-7" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              seekBy(SEEK_SECONDS);
            }}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={`${SEEK_SECONDS}초 앞으로`}
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      )}

      {!playbackError && !stalled && controlsVisible && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 px-3 pb-2 pt-6"
          style={{
            background:
              "linear-gradient(to top, rgb(0 0 0 / 0.7), transparent)",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const video = videoRef.current;
              if (!video) return;
              video.muted = !video.muted;
              setMuted(video.muted);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/10"
            aria-label={muted ? "음소거 해제" : "음소거"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="shrink-0 text-xs tabular-nums text-white">
            {formatTime(currentTime)}
          </span>
          <div
            ref={seekBarRef}
            onPointerDown={handleSeekPointerDown}
            className="relative h-4 flex-1 cursor-pointer touch-none"
          >
            <div className="absolute inset-y-0 my-auto h-1 w-full rounded-full bg-white/30" />
            <div
              className="absolute inset-y-0 my-auto h-1 rounded-full bg-white"
              style={{
                width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
              }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{
                left: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
              }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-white">
            {formatTime(duration)}
          </span>
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
