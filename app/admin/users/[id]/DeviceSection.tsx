"use client";

import { useActionState } from "react";
import { resetUserDevices, type ResetDevicesState } from "../actions";
import { MAX_DEVICES_PER_USER } from "@/lib/device";

const initialState: ResetDevicesState = {};

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
  const boundReset = resetUserDevices.bind(null, userId);
  const [state, formAction, isPending] = useActionState(
    boundReset,
    initialState,
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6">
      <p className="text-sm font-semibold text-zinc-900">
        등록된 기기 ({devices.length}/{MAX_DEVICES_PER_USER})
      </p>
      <p className="text-xs text-zinc-500">
        학생당 최대 {MAX_DEVICES_PER_USER}대까지 로그인이 허용됩니다. 새 기기에서
        로그인이 막혔다면 아래에서 초기화해주세요.
      </p>

      {devices.length === 0 && (
        <p className="text-xs text-zinc-400">등록된 기기가 없습니다.</p>
      )}
      {devices.length > 0 && (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600"
            >
              <p className="truncate font-medium text-zinc-700">
                {device.user_agent ?? "알 수 없는 기기"}
              </p>
              <p className="mt-0.5 text-zinc-400">
                최근 로그인{" "}
                {new Date(device.last_seen_at).toLocaleString("ko-KR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "등록된 기기를 모두 초기화할까요? 학생이 새 기기에서 다시 로그인할 수 있게 됩니다.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={isPending || devices.length === 0}
          className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark disabled:opacity-60"
        >
          {isPending ? "초기화 중..." : "기기 초기화"}
        </button>
        {state.error && (
          <p className="mt-2 text-sm font-medium text-red-500">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="mt-2 text-sm font-medium text-brand-dark">
            기기 등록이 초기화되었습니다.
          </p>
        )}
      </form>
    </div>
  );
}
