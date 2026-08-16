import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminPagePlaceholder from "@/components/layout/AdminPagePlaceholder";

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-8 pb-0">
        <Link
          href={`/admin/courses/${courseId}`}
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← {course.title}
        </Link>
      </div>
      <AdminPagePlaceholder
        title="학습 자료 관리"
        description={`${course.title} 강좌의 학습 자료 파일을 관리하는 페이지입니다.`}
      />
    </div>
  );
}
