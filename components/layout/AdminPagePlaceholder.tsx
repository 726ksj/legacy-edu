interface AdminPagePlaceholderProps {
  title: string;
  description?: string;
  routePath: string;
}

export default function AdminPagePlaceholder({
  title,
  description,
  routePath,
}: AdminPagePlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        {routePath}
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>
      )}
      <div className="mt-8 flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
        <p className="text-sm text-zinc-400">
          (임시 화면입니다. 데이터 연동 및 기능은 다음 단계에서 구현됩니다.)
        </p>
      </div>
    </div>
  );
}
