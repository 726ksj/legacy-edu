export interface NavChild {
  label: string;
  href: string;
  badge?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  badge?: boolean;
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "LEGACY를 소개합니다",
    href: "/about",
    children: [{ label: "대표 인사말", href: "/about/greeting" }],
  },
  {
    label: "강좌",
    href: "/courses",
    children: [
      { label: "중등", href: "/courses/middle" },
      { label: "고등", href: "/courses/high" },
    ],
  },
  {
    label: "커리큘럼",
    href: "/curriculum",
    children: [{ label: "LEGACY 커리큘럼", href: "/curriculum/legacy" }],
  },
  {
    label: "수강생 Review",
    href: "/reviews/course",
    children: [
      { label: "수강 후기", href: "/reviews/course" },
      { label: "강좌 후기", href: "/reviews/lecture" },
      { label: "학원 실제 후기", href: "/reviews/youtube" },
    ],
  },
  {
    label: "고객센터",
    href: "/customer-center",
    children: [
      { label: "공지사항", href: "/notice" },
      { label: "자주하는 질문", href: "/customer-center" },
      { label: "1:1 이용문의", href: "/customer-center/inquiry" },
    ],
  },
];

function myPageNavItem(isAdmin: boolean): NavItem {
  return {
    label: "마이페이지",
    href: isAdmin ? "/admin" : "/mypage",
    children: [
      { label: "나의 강좌", href: "/my-classroom" },
      { label: "나의 메모", href: "/mypage/notes" },
      { label: "장바구니", href: "/mypage/cart" },
      { label: "점수 리포트", href: "/mypage/score-report" },
      { label: "회원정보 관리", href: "/settings" },
    ],
  };
}

export function buildNavItems(isAdmin: boolean): NavItem[] {
  return [...NAV_ITEMS, myPageNavItem(isAdmin)];
}

// 로그인 여부를 아직 모르는 순간(정적 셸)에 보여줄 기본값 - 비로그인 상태와 동일
export const GUEST_NAV_ITEMS: NavItem[] = buildNavItems(false);
