"use client";

import { removeUserDevice } from "../actions";
import { MAX_DEVICES_PER_USER } from "@/lib/device";

interface DeviceRow {
  id: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

export default function DeviceSection({
  userId,
  devices,
}: {
  userId: string;
  devices: DeviceRow[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6">
      <p className="text-sm font-semibold text-zinc-900">
        등록된 기기 ({devices.length}/{MAX_DEVICES_PER_USER})
      </p>
      <p className="text-xs text-zinc-500">
        학생당 최대 {MAX_DEVICES_PER_USER}대까지 로그인이 허용됩니다. 더 이상
        쓰지 않는 기기만 골라서 해제할 수 있습니다.
      </p>

      {devices.length === 0 && (
        <p className="text-xs text-zinc-400">등록된 기기가 없습니다.</p>
      )}
      {devices.length > 0 && (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-700">
                  {device.user_agent ?? "알 수 없는 기기"}
                </p>
                <p className="mt-0.5 text-zinc-400">
                  최근 로그인{" "}
                  {new Date(device.last_seen_at).toLocaleString("ko-KR")}
                </p>
              </div>
              <form
                className="shrink-0"
                action={removeUserDevice.bind(null, userId, device.id)}
                onSubmit={(e) => {
                  if (!window.confirm("이 기기를 해제할까요?")) {
                    e.preventDefault();
                  }
                }}
              >
                <button
                  type="submit"
                  className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600"
                >
                  해제
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
