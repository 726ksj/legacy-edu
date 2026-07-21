import PagePlaceholder from "@/components/layout/PagePlaceholder";

export default function Page() {
  return (
    <PagePlaceholder
      title="영상 시청 화면"
      description="강의 영상을 시청하는 페이지입니다."
      routePath="/watch/[lessonId]"
    />
  );
}
