// 토스 API가 돌려주는 message는 "F113 카드사 응답 오류"처럼 진단 코드가
// 섞인 문구라 사용자에게 그대로 보여주기엔 불친절하다. 알려진 code만
// 친절한 문구로 바꾸고, 모르는 코드는 안전한 일반 문구로 대체한다.
const TOSS_ERROR_MESSAGES: Record<string, string> = {
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다. 다른 카드로 시도해주세요.",
  INVALID_CARD_EXPIRATION: "카드 유효기간을 다시 확인해주세요.",
  INVALID_STOPPED_CARD: "정지된 카드입니다. 카드사에 문의해주세요.",
  INVALID_CARD_LOST_OR_STOLEN: "분실 또는 도난 신고된 카드입니다.",
  EXCEED_MAX_DAILY_PAYMENT_COUNT: "일일 결제 가능 횟수를 초과했습니다.",
  EXCEED_MAX_PAYMENT_AMOUNT: "결제 가능한 금액을 초과했습니다.",
  EXCEED_MAX_AMOUNT: "최대 결제 금액을 초과했습니다.",
  NOT_ENOUGH_BALANCE: "잔액이 부족합니다.",
  INVALID_CARD_NUMBER: "카드 번호를 다시 확인해주세요.",
  INVALID_PASSWORD: "카드 비밀번호가 일치하지 않습니다.",
  NOT_MATCHES_BIRTH: "생년월일 정보가 일치하지 않습니다.",
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT:
    "할부가 지원되지 않는 카드입니다.",
  EXCEED_MAX_CARD_INSTALLMENT_PLAN: "설정 가능한 할부 개월 수를 초과했습니다.",
  USER_CANCEL: "결제를 취소하셨습니다.",
  ALREADY_PROCESSED_PAYMENT: "이미 처리된 결제입니다.",
  NOT_FOUND_PAYMENT: "결제 정보를 찾을 수 없습니다.",
  NOT_FOUND_PAYMENT_SESSION: "결제 시간이 만료되었습니다. 다시 시도해주세요.",
  REJECT_ACCOUNT_PAYMENT: "계좌 결제가 거절되었습니다.",
  INVALID_ACCOUNT_INFO_RE_REQUEST: "계좌 정보를 다시 확인해주세요.",
  RESTRICTED_TRANSFER_ACCOUNT: "이체가 제한된 계좌입니다.",
  NOT_AVAILABLE_BANK: "은행 서비스 이용 가능 시간이 아닙니다.",
  PROVIDER_ERROR:
    "결제 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

const DEFAULT_MESSAGE = "결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.";

export function friendlyTossMessage(code: string | null | undefined): string {
  if (!code) return DEFAULT_MESSAGE;
  return TOSS_ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}
