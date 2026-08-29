"use client";

import { useActionState, useState } from "react";
import { updateProfile, type UpdateProfileState } from "./actions";
import { formatPhoneInput } from "@/lib/phone";

const initialState: UpdateProfileState = {};

interface ProfileData {
  username: string;
  name: string;
  phone: string;
  guardian_phone: string | null;
  address: string;
  school: string | null;
  grade: string | null;
}

export default function EditProfileForm({
  profile,
  memberCode,
}: {
  profile: ProfileData;
  memberCode: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );
  const [phone, setPhone] = useState(formatPhoneInput(profile.phone));
  const [guardianPhone, setGuardianPhone] = useState(
    formatPhoneInput(profile.guardian_phone),
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        회원코드
        <input
          value={memberCode ?? "-"}
          disabled
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        아이디 (수정 불가)
        <input
          value={profile.username}
          disabled
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        이름
        <input
          name="name"
          defaultValue={profile.name}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        본인 전화번호
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        보호자 전화번호
        <input
          name="guardianPhone"
          type="tel"
          value={guardianPhone}
          onChange={(e) => setGuardianPhone(formatPhoneInput(e.target.value))}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        주소
        <input
          name="address"
          defaultValue={profile.address}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학교
        <input
          name="school"
          defaultValue={profile.school ?? ""}
          placeholder="예: 분당고등학교"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        학년
        <select
          name="grade"
          defaultValue={profile.grade ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="">선택 안 함</option>
          <option value="고1">고1</option>
          <option value="고2">고2</option>
          <option value="고3">고3</option>
        </select>
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-brand-dark">저장되었습니다.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
