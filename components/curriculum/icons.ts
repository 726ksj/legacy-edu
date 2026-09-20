import {
  FileSearch,
  BarChart3,
  Target,
  Lightbulb,
  RefreshCw,
  User,
  PenLine,
  CheckSquare,
  MessageCircle,
  TrendingUp,
  Users,
  FileText,
  Link2,
  Settings,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

// 관리자가 단계별 아이콘을 문자열 키로 골라 저장하고(curriculum_steps.icon),
// 화면에서는 이 맵으로 실제 아이콘 컴포넌트를 찾는다. 모르는 키가
// 저장돼 있어도(예: 마이그레이션 실수) 깨지지 않도록 항상 target으로
// 폴백한다.
export const CURRICULUM_ICONS: Record<string, LucideIcon> = {
  "file-search": FileSearch,
  "bar-chart": BarChart3,
  target: Target,
  lightbulb: Lightbulb,
  "refresh-cw": RefreshCw,
  user: User,
  "pen-line": PenLine,
  "check-square": CheckSquare,
  "message-circle": MessageCircle,
  "trending-up": TrendingUp,
  users: Users,
  "file-text": FileText,
  "link-2": Link2,
  settings: Settings,
  calendar: Calendar,
  "clipboard-check": ClipboardCheck,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
};

export const CURRICULUM_ICON_OPTIONS = Object.keys(CURRICULUM_ICONS) as Array<
  keyof typeof CURRICULUM_ICONS
>;

export function getCurriculumIcon(key: string): LucideIcon {
  return CURRICULUM_ICONS[key] ?? Target;
}
