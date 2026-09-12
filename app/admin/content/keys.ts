export const CONTENT_KEYS = [
  "hero_heading",
  "hero_subtitle",
  "about_body",
  "curriculum_intro",
  "curriculum_step1_title",
  "curriculum_step1_subtitle",
  "curriculum_step1_desc",
  "curriculum_step2_title",
  "curriculum_step2_subtitle",
  "curriculum_step2_desc",
  "curriculum_step3_title",
  "curriculum_step3_subtitle",
  "curriculum_step3_desc",
  "curriculum_step4_title",
  "curriculum_step4_subtitle",
  "curriculum_step4_desc",
  "curriculum_step5_title",
  "curriculum_step5_subtitle",
  "curriculum_step5_desc",
  "curriculum_step6_title",
  "curriculum_step6_subtitle",
  "curriculum_step6_desc",
  "business_name",
  "representative_name",
  "business_registration_number",
  "mail_order_business_number",
  "business_address",
  "business_phone",
  "refund_policy_body",
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

export type SiteContentMap = Record<ContentKey, string>;

export const CONTENT_DEFAULTS: SiteContentMap = {
  hero_heading: "고등 내신 & 수능 전문",
  hero_subtitle:
    "내신 전교 1등 maker! 압도적인 강의력, 꼼꼼한 관리로 학생 한 명 한 명의 배움의 자산(legacy)을 함께 만들어갑니다.",
  about_body: "",
  curriculum_intro:
    "가르치는 수업을 넘어, 성적이 완성되는 과정까지. 진단부터 성적 완성까지 이어지는 6단계 학습 시스템입니다.",
  curriculum_step1_title: "DIAGNOSE",
  curriculum_step1_subtitle: "진단",
  curriculum_step1_desc:
    "학생이 틀리는 진짜 원인부터 찾습니다. 어휘력·문장 분석·지문 이해·선택지 판단까지 세부적으로 진단합니다.",
  curriculum_step2_title: "VOCABULARY PRESCRIPTION",
  curriculum_step2_subtitle: "단어 처방",
  curriculum_step2_desc:
    "무조건 많이 외우는 단어 학습이 아닌, 학생의 암기 속도와 유지력에 맞춘 개인별 단어 처방입니다.",
  curriculum_step3_title: "CHOICE ANALYSIS",
  curriculum_step3_subtitle: "선택지 분석",
  curriculum_step3_desc:
    "정답의 근거뿐 아니라 나머지 선택지가 왜 오답인지까지 분석해, 스스로 판별할 수 있는 기준을 만듭니다.",
  curriculum_step4_title: "SCHOOL-FIT TEST",
  curriculum_step4_subtitle: "학교별 맞춤 테스트",
  curriculum_step4_desc:
    "학교별 기출문제와 출제 경향을 분석해, 실제 시험과 가까운 내신 유사 테스트를 구성합니다.",
  curriculum_step5_title: "ERROR CORRECTION",
  curriculum_step5_subtitle: "오답 교정",
  curriculum_step5_desc:
    "틀린 문제를 확인하는 데서 끝내지 않고, 실패 원인을 분석하고 누적 재시험으로 보완 여부를 확인합니다.",
  curriculum_step6_title: "FEEDBACK & REPORT",
  curriculum_step6_subtitle: "학습 리포트",
  curriculum_step6_desc:
    "점수뿐 아니라 학습 습관과 취약 유형, 다음 시험까지의 보완 계획을 학부모님께 전달합니다.",
  business_name: "LEGACY EDU",
  representative_name: "(대표자명 입력 필요)",
  business_registration_number: "(사업자등록번호 입력 필요)",
  mail_order_business_number: "(통신판매업신고번호 입력 필요)",
  business_address: "(사업장 주소 입력 필요)",
  business_phone: "(연락처 입력 필요)",
  refund_policy_body: `제1조 (환불 기준)
① 회원은 강좌 결제 후 아래 기준에 따라 환불을 요청할 수 있습니다.
② 강의를 전혀 수강하지 않은 경우: 결제일로부터 7일 이내 요청 시 전액 환불됩니다.
③ 강의를 일부 수강한 경우: 결제 금액에서 실제 이용한 강의 분량에 해당하는 금액과 할인 혜택을 제외한 나머지 금액을 환불합니다.
④ 수강 기간의 2분의 1이 경과했거나 전체 강의의 2분의 1 이상을 수강한 경우, 환불이 제한될 수 있습니다.

제2조 (환불 절차)
환불을 원하시는 회원은 고객센터 또는 담당 강사/조교를 통해 환불을 요청해주세요. 요청일로부터 영업일 기준 3~5일 이내에 결제하신 수단으로 환불됩니다.

제3조 (환불 제한)
이벤트·프로모션으로 무료 제공된 혜택은 환불 대상에서 제외됩니다.

본 환불 규정은 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령 및 회사 정책에 따라 변경될 수 있습니다.`,
};
