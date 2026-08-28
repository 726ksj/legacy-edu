import * as Sentry from "@sentry/nextjs";

// Server Components, Route Handlers, Server Actions에서 나는 에러를
// Sentry로 보낸다. DSN이 없으면 Sentry.init이 조용히 아무 것도 하지
// 않으므로 로컬 개발 환경에서는 그냥 비활성 상태로 남는다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
