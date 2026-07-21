import AdminPagePlaceholder from "@/components/layout/AdminPagePlaceholder";

export default function Page() {
  return (
    <AdminPagePlaceholder
      title="회원 관리"
      description="가입한 학생/학부모 회원 정보를 관리하는 페이지입니다."
      routePath="/admin/users"
    />
  );
}
