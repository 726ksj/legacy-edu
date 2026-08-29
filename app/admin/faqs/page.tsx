import { createAdminClient } from "@/lib/supabase/admin";
import { updateFaq, deleteFaq } from "./actions";
import AddFaqForm from "./AddFaqForm";
import FaqRow from "./FaqRow";

export const dynamic = "force-dynamic";

interface FaqData {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export default async function Page() {
  const supabase = createAdminClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("id, question, answer, sort_order")
    .order("sort_order", { ascending: true })
    .returns<FaqData[]>();

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">FAQ 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        고객센터 페이지에 노출되는 자주 묻는 질문을 관리합니다.
      </p>

      <div className="mt-6">
        <AddFaqForm />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {faqs?.map((faq) => (
          <FaqRow
            key={faq.id}
            faq={faq}
            onUpdate={updateFaq.bind(null, faq.id)}
            onDelete={deleteFaq.bind(null, faq.id)}
          />
        ))}
        {faqs?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 FAQ가 없습니다.</p>
        )}
      </ul>
    </div>
  );
}
