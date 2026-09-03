import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/supabase/server";

// 회원/스태프 관리 화면에서 관리자 계정 자체가 실수로 삭제되지 않도록
// 막는다. 관리자는 isAdmin()이 이메일만으로 판별하는 별도 개념이라,
// profiles.role상으로는 학생/강사/조교 목록 어디에도 나타날 수 있고 그
// 목록의 삭제 버튼만으로는 구분이 안 된다.
export async function isProtectedAdminAccount(
  profileId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.auth.admin.getUserById(profileId);
  return isAdmin(data?.user ? { email: data.user.email ?? null } : null);
}
