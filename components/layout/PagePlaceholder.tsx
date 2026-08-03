interface PagePlaceholderProps {
  title: string;
  description?: string;
}

/**
 * 1단계(구조/라우팅) 임시 페이지 컴포넌트.
 * 실제 기능 구현 전, 각 라우트가 올바르게 연결되었는지 확인하기 위한 placeholder.
 */
export default function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">{title}</h1>
      {description && (
        <p className="mt-3 max-w-2xl text-zinc-500">{description}</p>
      )}
      <p className="mt-8 text-sm text-zinc-400">
        (임시 화면입니다. 실제 기능은 다음 단계에서 구현됩니다.)
      </p>
    </section>
  );
}
