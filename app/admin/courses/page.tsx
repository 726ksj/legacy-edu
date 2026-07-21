import AdminPagePlaceholder from "@/components/layout/AdminPagePlaceholder";

export default function Page() {
  return (
    <AdminPagePlaceholder
      title="강좌 관리"
      description="개설 강좌 정보를 등록/수정하는 페이지입니다."
      routePath="/admin/courses"
    />
  );
}
