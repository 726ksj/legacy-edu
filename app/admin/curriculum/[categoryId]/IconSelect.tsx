"use client";

import { CURRICULUM_ICON_OPTIONS, getCurriculumIcon } from "@/components/curriculum/icons";

export default function IconSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? CURRICULUM_ICON_OPTIONS[0]}
      className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
    >
      {CURRICULUM_ICON_OPTIONS.map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}

export function IconPreview({ iconKey }: { iconKey: string }) {
  const Icon = getCurriculumIcon(iconKey);
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark">
      <Icon className="h-4 w-4" />
    </span>
  );
}
