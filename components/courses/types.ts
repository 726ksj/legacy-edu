export interface CourseListItem {
  id: string;
  subject: string;
  teacherName: string;
  title: string;
  school: string | null;
  tagline: string | null;
  isBest: boolean;
  durationDays: number | null;
  lectureCount: number;
  price: number;
  materialPrice: number | null;
}
