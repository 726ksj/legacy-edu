import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface FaqRow {
  id: string;
  question: string;
  answer: string;
}

export default async function CustomerCenterPage() {
  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("id, question, answer")
    .order("sort_order", { ascending: true })
    .returns<FaqRow[]>();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          FAQ
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          자주 묻는 질문
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          자주 묻는 질문을 확인해보세요. 원하는 답을 못 찾으셨다면{" "}
          <Link
            href="/customer-center/inquiry"
            className="font-semibold text-brand-dark hover:underline"
          >
            1:1 이용문의
          </Link>
          를 남겨주세요.
        </p>
      </div>

      {(!faqs || faqs.length === 0) && (
        <p className="text-sm text-zinc-500">등록된 FAQ가 없습니다.</p>
      )}

      {faqs && faqs.length > 0 && (
        <div className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {faqs.map((faq) => (
            <details key={faq.id} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-zinc-900 marker:content-none">
                <span>Q. {faq.question}</span>
                <span className="shrink-0 text-zinc-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
