export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-4 py-24 sm:px-6">
      <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
        /about
      </span>
      <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
        LEGACY EDU 소개
      </h1>

      <div className="space-y-5 text-base leading-relaxed text-zinc-600">
        <p>안녕하세요. 레가시 에듀 대표 박정근입니다.</p>
        <p>
          급변하는 교육제도로 인해, 선행 학습은 사실상 필수 사항이 되어버렸고,
          이로 인해 많은 학생들과 학부모님들이 좌절하는 모습을 보았습니다.
        </p>
        <p>
          그래서 저희 레가시 에듀는 학생 한 명 한 명에게 진심을 담아 배움의
          희망을 다시 안겨드리고자 합니다.
        </p>
        <p>
          공부는 결국, 마음이 전해지는 일이라고 믿습니다. 그 믿음을 바탕으로
          오늘도 함께 배움의 자산(legacy)을 만들어 가겠습니다.
        </p>
        <p className="pt-4 font-semibold text-zinc-800">레가시 대표 박정근 배상</p>
      </div>
    </section>
  );
}
