import InquiryForm from "./InquiryForm";

export default function InquiryPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Inquiry
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          1:1 이용문의
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          FAQ에서 답을 못 찾으셨다면 아래로 문의를 남겨주세요.
        </p>
      </div>

      <InquiryForm />
    </section>
  );
}
