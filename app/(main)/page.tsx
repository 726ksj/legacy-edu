import ReviewSection from "@/components/home/ReviewSection";
import VideoSection from "@/components/home/VideoSection";
import CurriculumSection from "@/components/home/CurriculumSection";
import CurriculumStickyNav from "@/components/home/CurriculumStickyNav";
import LegacyCurriculumSection, {
  type LegacyCurriculumEntry,
} from "@/components/home/LegacyCurriculumSection";
import MyCoursesStrip from "@/components/home/MyCoursesStrip";
import MyTeachingCoursesStrip from "@/components/home/MyTeachingCoursesStrip";
import MyChatRoomsStrip, {
  type ChatRoomStripItem,
} from "@/components/home/MyChatRoomsStrip";
import HomePopups from "@/components/home/HomePopups";
import { createClient, getAuthUser, isAdmin } from "@/lib/supabase/server";
import {
  getMemberRole,
  getStaffCourseIds,
  getTeacherCourseIds,
} from "@/lib/teachers";
import { CONTENT_DEFAULTS, type SiteContentMap } from "@/app/admin/content/keys";

interface Enrollment {
  enrolled_at: string;
  courses: {
    id: string;
    subject: string;
    title: string;
    teacher_name: string;
  } | null;
}

interface MyCourseItem {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
  hasNewLesson: boolean;
}

export default async function HomePage() {
  const supabase = await createClient();

  // user 정보와 리뷰/사이트 콘텐츠/팝업은 서로 무관하니 병렬로 요청한다.
  const [user, { data: reviews }, { data: contentRows }, { data: popups }] =
    await Promise.all([
      getAuthUser(),
      supabase
        .from("reviews")
        .select("id, name, school, subject, summary, detail")
        .order("created_at", { ascending: false }),
      supabase.from("site_content").select("key, value"),
      supabase
        .from("popups")
        .select("id, title, body, image_url, link_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  let myCourses: MyCourseItem[] = [];
  let teachingCourses: NonNullable<Enrollment["courses"]>[] = [];
  let staffRole: "teacher" | "assistant" | null = null;
  let chatRooms: ChatRoomStripItem[] = [];

  if (user && !isAdmin(user)) {
    const role = await getMemberRole(user.id);
    if (role === "teacher" || role === "assistant") {
      staffRole = role;
      const courseIds =
        role === "teacher"
          ? await getTeacherCourseIds(user.id)
          : await getStaffCourseIds(user.id);
      if (courseIds.length > 0) {
        const { data: courseRows } = await supabase
          .from("courses")
          .select("id, subject, title, teacher_name")
          .in("id", courseIds);
        teachingCourses = courseRows ?? [];
      }
    } else {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("enrolled_at, courses(id, subject, title, teacher_name)")
        .eq("profile_id", user.id)
        .returns<Enrollment[]>();
      const enrolledCourses = (enrollments ?? [])
        .filter((enrollment): enrollment is Enrollment & {
          courses: NonNullable<Enrollment["courses"]>;
        } => Boolean(enrollment.courses))
        .map((enrollment) => ({
          ...enrollment.courses,
          enrolled_at: enrollment.enrolled_at,
        }));

      // 원터치 채팅방 바로가기 + 안읽음 표시. 아직 채팅방을 연 적 없는
      // 강좌(방이 아직 없음)도 카드는 보여준다 - 처음 눌렀을 때 그
      // 채팅방 화면(/my-classroom/[courseId]/chat)이 알아서 만들어준다.
      if (enrolledCourses.length > 0) {
        const courseIds = enrolledCourses.map((course) => course.id);
        const { data: roomRows } = await supabase
          .from("chat_rooms")
          .select("id, course_id")
          .eq("student_profile_id", user.id)
          .in("course_id", courseIds);

        const roomByCourseId = new Map(
          (roomRows ?? []).map((room) => [room.course_id, room.id as string]),
        );
        const roomIds = [...roomByCourseId.values()];

        let lastReadByRoom = new Map<string, string>();
        let latestByRoom = new Map<string, string>();

        if (roomIds.length > 0) {
          const [{ data: reads }, latestResults] = await Promise.all([
            supabase
              .from("chat_room_reads")
              .select("room_id, last_read_at")
              .eq("profile_id", user.id)
              .in("room_id", roomIds),
            Promise.all(
              roomIds.map(async (roomId) => {
                const { data } = await supabase
                  .from("chat_messages")
                  .select("created_at")
                  .eq("room_id", roomId)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                return [roomId, data?.created_at] as const;
              }),
            ),
          ]);
          lastReadByRoom = new Map(
            (reads ?? []).map((read) => [read.room_id, read.last_read_at as string]),
          );
          latestByRoom = new Map(
            latestResults.filter(
              (result): result is [string, string] => Boolean(result[1]),
            ),
          );
        }

        chatRooms = enrolledCourses.map((course) => {
          const roomId = roomByCourseId.get(course.id);
          const latest = roomId ? latestByRoom.get(roomId) : undefined;
          const lastRead = roomId ? lastReadByRoom.get(roomId) : undefined;
          return {
            courseId: course.id,
            subject: course.subject,
            title: course.title,
            teacherName: course.teacher_name,
            hasUnread: Boolean(latest && (!lastRead || latest > lastRead)),
          };
        });

        // 새 영상 표시. 강좌를 아직 한 번도 열어본 적 없다면(읽음 기록이
        // 없다면) 수강 등록 시점 이후 올라온 영상만 "새 영상"으로 친다 -
        // 등록 전부터 있던 기존 영상들까지 전부 새 것으로 뜨면 안 되니까.
        const [{ data: lessonRows }, { data: readRows }] = await Promise.all([
          supabase
            .from("lessons")
            .select("course_id, created_at")
            .eq("status", "ready")
            .eq("is_hidden", false)
            .in("course_id", courseIds),
          supabase
            .from("course_lesson_reads")
            .select("course_id, last_read_at")
            .eq("profile_id", user.id)
            .in("course_id", courseIds),
        ]);

        const latestLessonByCourse = new Map<string, string>();
        for (const row of lessonRows ?? []) {
          const prev = latestLessonByCourse.get(row.course_id);
          if (!prev || row.created_at > prev) {
            latestLessonByCourse.set(row.course_id, row.created_at);
          }
        }
        const lastReadByCourse = new Map(
          (readRows ?? []).map((row) => [row.course_id, row.last_read_at as string]),
        );

        myCourses = enrolledCourses.map((course) => {
          const latest = latestLessonByCourse.get(course.id);
          const lastRead = lastReadByCourse.get(course.id) ?? course.enrolled_at;
          return {
            id: course.id,
            subject: course.subject,
            title: course.title,
            teacher_name: course.teacher_name,
            hasNewLesson: Boolean(latest && latest > lastRead),
          };
        });
      }
    }
  }

  const content: SiteContentMap = { ...CONTENT_DEFAULTS };
  for (const row of contentRows ?? []) {
    if (row.key in content) {
      content[row.key as keyof SiteContentMap] = row.value;
    }
  }

  const curriculumSteps = [1, 2, 3, 4, 5, 6].map((n) => ({
    no: String(n).padStart(2, "0"),
    title: content[`curriculum_step${n}_title` as keyof SiteContentMap],
    subtitle: content[`curriculum_step${n}_subtitle` as keyof SiteContentMap],
    description: content[`curriculum_step${n}_desc` as keyof SiteContentMap],
  }));

  // 학교급/트랙에 배정되지 않은 커리큘럼 카테고리는 홈 화면 "레가시
  // 커리큘럼" 섹션에 노출된다 (예: 개인별 난이도 맞춤 시스템, 매 수업
  // 진행 시스템).
  const { data: homeCurriculumCategories } = await supabase
    .from("curriculum_categories")
    .select(
      "id, slug, title, subtitle, intro, closing_title, closing_description",
    )
    .is("track_id", null)
    .order("sort_order", { ascending: true });

  const homeCategoryIds = (homeCurriculumCategories ?? []).map((c) => c.id);
  const { data: homeCurriculumSteps } = homeCategoryIds.length
    ? await supabase
        .from("curriculum_steps")
        .select("id, category_id, icon, title, description")
        .in("category_id", homeCategoryIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const legacyCurriculumEntries: LegacyCurriculumEntry[] = (
    homeCurriculumCategories ?? []
  ).map((category) => ({
    category,
    steps: (homeCurriculumSteps ?? []).filter(
      (step) => step.category_id === category.id,
    ),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <HomePopups popups={popups ?? []} />
      <section className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-4 py-6 sm:px-6 sm:py-16 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col items-start gap-6">
          <h1 className="text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            {content.hero_heading}
            <br />
            <span className="text-brand-dark">LEGACY EDU</span>
          </h1>
          <p className="max-w-xl whitespace-pre-line text-zinc-500">
            {content.hero_subtitle}
          </p>
          {chatRooms.length > 0 && <MyChatRoomsStrip rooms={chatRooms} />}
          {myCourses.length > 0 && <MyCoursesStrip courses={myCourses} />}
          {staffRole && teachingCourses.length > 0 && (
            <MyTeachingCoursesStrip role={staffRole} courses={teachingCourses} />
          )}
        </div>
      </section>

      <VideoSection />
      <LegacyCurriculumSection entries={legacyCurriculumEntries} />
      <CurriculumStickyNav steps={curriculumSteps} />
      <CurriculumSection
        intro={content.curriculum_intro}
        steps={curriculumSteps}
      />
      <ReviewSection reviews={reviews ?? []} />
    </div>
  );
}
