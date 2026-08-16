import { createClient } from "@/lib/supabase/server";

const DEFAULT_ABOUT_BODY = `안녕하세요. 레가시 에듀 대표 박정근입니다.

급변하는 교육제도로 인해, 선행 학습은 사실상 필수 사항이 되어버렸고, 이로 인해 많은 학생들과 학부모님들이 좌절하는 모습을 보았습니다.

그래서 저희 레가시 에듀는 학생 한 명 한 명에게 진심을 담아 배움의 희망을 다시 안겨드리고자 합니다.

공부는 결국, 마음이 전해지는 일이라고 믿습니다. 그 믿음을 바탕으로 오늘도 함께 배움의 자산(legacy)을 만들어 가겠습니다.

레가시 대표 박정근 배상`;

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "about_body")
    .maybeSingle();

  const aboutBody: string = data?.value ?? DEFAULT_ABOUT_BODY;
  const paragraphs = aboutBody
    .split(/\n{2,}/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  const signature = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : null;
  const bodyParagraphs = signature ? paragraphs.slice(0, -1) : paragraphs;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Greeting
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          대표 인사말
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
      </div>

      <div className="space-y-5 text-base leading-relaxed text-zinc-600">
        {bodyParagraphs.map((paragraph: string, i: number) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>

      {signature && (
        <div className="flex flex-col items-end gap-1 border-t border-zinc-100 pt-6 text-right">
          <p className="whitespace-pre-line text-base font-semibold tracking-tight text-zinc-900">
            {signature}
          </p>
        </div>
      )}
    </section>
  );
}
