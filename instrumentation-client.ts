import * as Sentry from "@sentry/nextjs";

// 브라우저에서 발생하는 미처리 예외/프로미스 거부를 Sentry로 보낸다.
// Sentry.init이 자체적으로 전역 에러 리스너를 등록하므로 따로
// window.addEventListener를 걸 필요는 없다.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
