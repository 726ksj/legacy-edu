"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>문제가 발생했습니다.</h2>
          <p>잠시 후 다시 시도해주세요.</p>
        </div>
      </body>
    </html>
  );
}
