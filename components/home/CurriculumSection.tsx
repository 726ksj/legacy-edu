const STEPS = [
  {
    no: "01",
    title: "DIAGNOSE",
    subtitle: "진단",
    description:
      "학생이 틀리는 진짜 원인부터 찾습니다. 어휘력·문장 분석·지문 이해·선택지 판단까지 세부적으로 진단합니다.",
  },
  {
    no: "02",
    title: "VOCABULARY PRESCRIPTION",
    subtitle: "단어 처방",
    description:
      "무조건 많이 외우는 단어 학습이 아닌, 학생의 암기 속도와 유지력에 맞춘 개인별 단어 처방입니다.",
  },
  {
    no: "03",
    title: "CHOICE ANALYSIS",
    subtitle: "선택지 분석",
    description:
      "정답의 근거뿐 아니라 나머지 선택지가 왜 오답인지까지 분석해, 스스로 판별할 수 있는 기준을 만듭니다.",
  },
  {
    no: "04",
    title: "SCHOOL-FIT TEST",
    subtitle: "학교별 맞춤 테스트",
    description:
      "학교별 기출문제와 출제 경향을 분석해, 실제 시험과 가까운 내신 유사 테스트를 구성합니다.",
  },
  {
    no: "05",
    title: "ERROR CORRECTION",
    subtitle: "오답 교정",
    description:
      "틀린 문제를 확인하는 데서 끝내지 않고, 실패 원인을 분석하고 누적 재시험으로 보완 여부를 확인합니다.",
  },
  {
    no: "06",
    title: "FEEDBACK & REPORT",
    subtitle: "학습 리포트",
    description:
      "점수뿐 아니라 학습 습관과 취약 유형, 다음 시험까지의 보완 계획을 학부모님께 전달합니다.",
  },
];

export default function CurriculumSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div>
        <span className="text-sm font-semibold text-brand-dark">
          LEGACY ACADEMIC SYSTEM
        </span>
        <h2 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          영어 커리큘럼
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-500">
          가르치는 수업을 넘어, 성적이 완성되는 과정까지. 진단부터 성적
          완성까지 이어지는 6단계 학습 시스템입니다.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.no}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-5"
          >
            <span className="text-xs font-bold text-brand-dark">
              {step.no}
            </span>
            <p className="text-sm font-semibold text-zinc-900">
              {step.title}
              <span className="ml-1 font-normal text-zinc-400">
                · {step.subtitle}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
