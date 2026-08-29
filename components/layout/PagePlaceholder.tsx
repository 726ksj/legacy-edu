interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/**
 * 1단계(구조/라우팅) 임시 페이지 컴포넌트.
 * 실제 기능 구현 전, 각 라우트가 올바르게 연결되었는지 확인하기 위한 placeholder.
 * 대표 인사말 페이지와 동일한 레이블+타이틀+밑줄 바 레이아웃을 공유한다.
 */
export default function PagePlaceholder({
  eyebrow,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          {eyebrow}
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {title}
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        {description && (
          <p className="text-sm text-zinc-500">{description}</p>
        )}
      </div>
      <p className="text-sm text-zinc-400">
        (임시 화면입니다. 실제 기능은 다음 단계에서 구현됩니다.)
      </p>
    </section>
  );
}
