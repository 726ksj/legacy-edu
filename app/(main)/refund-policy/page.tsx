import { createClient } from "@/lib/supabase/server";
import { CONTENT_DEFAULTS } from "@/app/admin/content/keys";

export default async function RefundPolicyPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "refund_policy_body")
    .maybeSingle();

  const body: string = data?.value ?? CONTENT_DEFAULTS.refund_policy_body;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Refund Policy
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          환불/교환 안내
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
      </div>

      <div className="space-y-5 text-base leading-relaxed text-zinc-600">
        {paragraphs.map((paragraph: string, i: number) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
