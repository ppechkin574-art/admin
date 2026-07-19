import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BookMarked,
  CreditCard,
  FileText,
  Flame,
  FolderKanban,
  Gift,
  LinkIcon,
  Trophy,
  Puzzle,
  Users,
  GraduationCap,
  Layers,
  Dumbbell,
  Sparkles,
  Smartphone,
  Gauge,
  Wallet,
  FileStack,
  ArrowUpCircle,
  Shield,
  Languages,
  CalendarDays,
  Award,
  type LucideIcon,
} from "lucide-react";

export type SidebarLeafItem = { label: string; href: string; icon: LucideIcon };
export type SidebarGroupItem = { label: string; icon: LucideIcon; children: SidebarLeafItem[] };
export type SidebarItem = SidebarLeafItem | SidebarGroupItem;

export const isSidebarGroup = (item: SidebarItem): item is SidebarGroupItem =>
  "children" in item;

export const menuItemsGen2: SidebarItem[] = [
  { label: "CRM", href: "/crm", icon: FolderKanban },
  { label: "Модули", href: "/modules", icon: Puzzle },
  { label: "Пробное ЕНТ", href: "/ent-practice/subjects", icon: GraduationCap },
  { label: "Тренажёр по темам", href: "/trainer-v2/subjects", icon: Layers },
  { label: "Пользователи", href: "/users", icon: Users },
  { label: "Безопасность", href: "/security", icon: Shield },
  { label: "Маркетинг", href: "/marketing", icon: BarChart3 },
  { label: "Финансы", href: "/finance", icon: Wallet },
  { label: "Перевод", href: "/translation", icon: Languages },
  { label: "Скорость API", href: "/performance", icon: Gauge },
  { label: "Push-уведомления", href: "/push", icon: Bell },
  {
    label: "Фичи подписки",
    href: "/content/subscription-benefits",
    icon: Sparkles,
  },
  {
    label: "Реферралы",
    href: "/referrals/policy",
    icon: Gift,
  },
  {
    label: "Турнир",
    icon: Award,
    // CRM #6: "Турнир" is a navigation group, not a new game entity — the
    // only content it holds so far is the existing "События" page. When a
    // dedicated tournament feature ships (CRM #10/#14), add its section
    // here instead of creating a new top-level menu entry.
    children: [
      {
        label: "События",
        href: "/events",
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "Призы топов",
    href: "/leaderboard-prizes",
    icon: Trophy,
  },
  {
    label: "Награды стрика",
    href: "/streak-rewards",
    icon: Flame,
  },
  {
    label: "Push: напоминание о стрике",
    href: "/streak-push",
    icon: Bell,
  },
  {
    label: "Маскот",
    href: "/mascot",
    icon: Bot,
  },
  {
    label: "Онбординг",
    href: "/onboarding",
    icon: BookMarked,
  },
  {
    label: "Страницы приложения",
    href: "/app-screens",
    icon: Smartphone,
  },
  {
    label: "Обновление приложения",
    href: "/app-update",
    icon: ArrowUpCircle,
  },
];

export const menuItemsGen1 = [
  { label: "Связки предметов", href: "/subject-combinations", icon: LinkIcon },
  { label: "Тренажеры", href: "/trainers", icon: Dumbbell },
  { label: "Предметы", href: "/subjects", icon: BookOpen },
  { label: "Темы", href: "/topics", icon: FolderKanban },
  { label: "Вопросы", href: "/questions", icon: FileText },
  { label: "Черновики вопросов", href: "/question-drafts", icon: FileStack },
  { label: "Промокоды", href: "/promocodes", icon: CreditCard },
];
