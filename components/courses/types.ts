export const COURSE_CATEGORIES = [
  "기초입문",
  "기본이론",
  "심화이론",
  "파이널",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export interface CourseListItem {
  id: string;
  subject: string;
  teacherName: string;
  title: string;
  category: CourseCategory | null;
  tagline: string | null;
  isBest: boolean;
  durationDays: number | null;
  lectureCount: number;
  price: number;
  materialPrice: number | null;
}
