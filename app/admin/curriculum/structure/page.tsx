import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteSchoolLevel, deleteTrack } from "./actions";
import AddLevelForm from "./AddLevelForm";
import AddTrackForm from "./AddTrackForm";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export const dynamic = "force-dynamic";

interface TrackRow {
  id: string;
  slug: string;
  title: string;
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: levels } = await supabase
    .from("curriculum_school_levels")
    .select("id, slug, title")
    .order("sort_order", { ascending: true });

  const levelIds = (levels ?? []).map((l) => l.id);
  const { data: trackRows } = levelIds.length
    ? await supabase
        .from("curriculum_tracks")
        .select("id, slug, title, school_level_id")
        .in("school_level_id", levelIds)
        .order("sort_order", { ascending: true })
    : { data: [] as (TrackRow & { school_level_id: string })[] };

  const tracksByLevel = new Map<string, TrackRow[]>();
  for (const row of trackRows ?? []) {
    const list = tracksByLevel.get(row.school_level_id) ?? [];
    list.push(row);
    tracksByLevel.set(row.school_level_id, list);
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/curriculum"
        className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 커리큘럼 관리
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">
        학교급·트랙 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        커리큘럼 카테고리를 배정할 학교급(고등/중등)과 그 하위 트랙(예:
        예비 고등, 고등 내신)을 관리합니다.
      </p>

      <div className="mt-6">
        <AddLevelForm />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {levels?.map((level) => (
          <div
            key={level.id}
            className="rounded-lg border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-zinc-900">
                  {level.title}
                </p>
                <p className="font-mono text-xs text-zinc-400">
                  /curriculum/{level.slug}
                </p>
              </div>
              <ConfirmDeleteButton
                action={deleteSchoolLevel.bind(null, level.id)}
                confirmMessage="이 학교급을 삭제할까요? 하위 트랙도 함께 삭제되고, 배정된 카테고리는 미배정 상태가 됩니다."
              />
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {(tracksByLevel.get(level.id) ?? []).map((track) => (
                <li
                  key={track.id}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-700">
                    {track.title}{" "}
                    <span className="font-mono text-xs text-zinc-400">
                      /{track.slug}
                    </span>
                  </span>
                  <ConfirmDeleteButton
                    action={deleteTrack.bind(null, track.id)}
                    confirmMessage="이 트랙을 삭제할까요? 배정된 카테고리는 미배정 상태가 됩니다."
                  />
                </li>
              ))}
              {(tracksByLevel.get(level.id) ?? []).length === 0 && (
                <p className="text-xs text-zinc-400">등록된 트랙이 없습니다.</p>
              )}
            </ul>

            <div className="mt-4 border-t border-zinc-100 pt-4">
              <AddTrackForm schoolLevelId={level.id} />
            </div>
          </div>
        ))}
        {levels?.length === 0 && (
          <p className="text-sm text-zinc-400">등록된 학교급이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
