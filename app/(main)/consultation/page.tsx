import ConsultationForm from "./ConsultationForm";

export default function ConsultationPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Consultation
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          상담하기
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          아래 내용을 남겨주시면 순차적으로 연락드려요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-light bg-brand-light/40 p-5 text-sm leading-relaxed text-zinc-700">
        <p>상담은 반드시 오프라인으로 진행됩니다.</p>
        <p className="mt-1">
          오프라인으로 상담받기 어려우시면, 원비를 먼저 결제하고 학생코드를
          부여받아 바로 시작하실 수도 있어요.
        </p>
      </div>

      <ConsultationForm />
    </section>
  );
}
