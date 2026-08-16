"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updateUser, type UpdateUserState } from "../actions";

const initialState: UpdateUserState = {};

interface UserData {
  id: string;
  username: string;
  name: string;
  phone: string;
  guardian_phone: string | null;
  address: string;
  school: string | null;
  grade: string | null;
}

export default function EditUserForm({ user }: { user: UserData }) {
  const boundUpdateUser = updateUser.bind(null, user.id);
  const [state, formAction, isPending] = useActionState(
    boundUpdateUser,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        아이디 (수정 불가)
        <input
          value={user.username}
          disabled
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이름
        <input
          name="name"
          defaultValue={user.name}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        본인 전화번호
        <input
          name="phone"
          type="tel"
          defaultValue={user.phone}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        보호자 전화번호
        <input
          name="guardianPhone"
          type="tel"
          defaultValue={user.guardian_phone ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
        주소
        <input
          name="address"
          defaultValue={user.address}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학교
        <input
          name="school"
          defaultValue={user.school ?? ""}
          placeholder="예: 분당고등학교"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학년
        <select
          name="grade"
          defaultValue={user.grade ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="">선택 안 함</option>
          <option value="고1">고1</option>
          <option value="고2">고2</option>
          <option value="고3">고3</option>
        </select>
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500 sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark sm:col-span-2">
          저장되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:col-span-2 sm:self-start"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
