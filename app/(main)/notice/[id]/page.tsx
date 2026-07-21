import PagePlaceholder from "@/components/layout/PagePlaceholder";

export default function Page() {
  return (
    <PagePlaceholder
      title="NOTICE 상세"
      description="선택한 공지사항의 상세 내용을 보여주는 페이지입니다."
      routePath="/notice/[id]"
    />
  );
}
