import { describe, expect, it } from "vitest";
import { friendlyTossMessage } from "./tossErrorMessages";

describe("friendlyTossMessage", () => {
  it("알려진 코드는 친절한 한글 문구로 변환한다", () => {
    expect(friendlyTossMessage("REJECT_CARD_COMPANY")).toBe(
      "카드사에서 결제를 거절했습니다. 다른 카드로 시도해주세요.",
    );
  });

  it("모르는 코드는 안전한 기본 문구로 대체한다 (원문 노출 방지)", () => {
    expect(friendlyTossMessage("SOME_UNMAPPED_CODE")).toBe(
      "결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
    );
  });

  it("코드가 없으면 기본 문구를 반환한다", () => {
    expect(friendlyTossMessage(undefined)).toBe(
      "결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
    );
    expect(friendlyTossMessage(null)).toBe(
      "결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
    );
  });
});
