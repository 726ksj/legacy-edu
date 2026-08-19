"use client";

import { useEffect } from "react";

// 카카오톡 인앱 브라우저는 상단에 주소창/텍스트 크기 조절 바가 항상 떠 있고
// 쿠키·결제 SDK 동작도 일반 브라우저와 달라서, 카카오가 공식 제공하는
// kakaotalk://web/openExternal 스킴으로 기기 기본 브라우저를 띄워 우회한다.
export default function KakaoInAppRedirect() {
  useEffect(() => {
    if (!/KAKAOTALK/i.test(navigator.userAgent)) return;

    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(
      window.location.href,
    )}`;
  }, []);

  return null;
}
