import AdminPagePlaceholder from "@/components/layout/AdminPagePlaceholder";

export default function Page() {
  return (
    <AdminPagePlaceholder
      title="상담 신청 관리"
      description="학생/학부모가 신청한 상담 내역을 확인하고 처리하는 페이지입니다."
      routePath="/admin/consultations"
    />
  );
}
