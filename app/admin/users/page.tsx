import { createAdminClient } from "@/lib/supabase/admin";
import UsersTable from "./UsersTable";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, name, school, grade")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">회원 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        가입한 학생/학부모 회원 정보를 확인하는 페이지입니다. 자세한 정보,
        수정, 탈퇴 처리는 「자세히 보기」에서 할 수 있습니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <UsersTable users={users ?? []} />
    </div>
  );
}
