import AdminPagePlaceholder from "@/components/layout/AdminPagePlaceholder";

export default function Page() {
  return (
    <AdminPagePlaceholder
      title="수강 권한 관리"
      description="학생별 수강 권한(수강신청 승인)을 관리하는 페이지입니다."
      routePath="/admin/enrollments"
    />
  );
}
