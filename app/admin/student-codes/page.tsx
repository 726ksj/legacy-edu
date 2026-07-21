import AdminPagePlaceholder from "@/components/layout/AdminPagePlaceholder";

export default function Page() {
  return (
    <AdminPagePlaceholder
      title="학생코드 관리"
      description="회원가입에 사용되는 학생코드를 발급/관리하는 페이지입니다."
      routePath="/admin/student-codes"
    />
  );
}
