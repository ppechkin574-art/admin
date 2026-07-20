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
  Timer,
  type LucideIcon,
} from "lucide-react";

export type SidebarLeafItem = { label: string; href: string; icon: LucideIcon };
export type SidebarGroupItem = { label: string; icon: LucideIcon; children: SidebarLeafItem[] };
export type SidebarItem = SidebarLeafItem | SidebarGroupItem;

export const isSidebarGroup = (item: SidebarItem): item is SidebarGroupItem =>
  "children" in item;

export const menuItemsGen2: SidebarItem[] = [
  { label: "CRM", href: "/crm", icon: FolderKanban },
  {
    label: "Турнир",
    icon: Award,
    // CRM #6/#19: "Турнир" is a navigation group, not a game entity. Placed
    // straight after CRM because the weekly sprint is edited every week —
    // it is operational work, unlike the content sections further down.
    // "События" lives here (it edits the same home screen) rather than as a
    // top-level entry, so everything the Главная shows is in one place.
    children: [
      {
        label: "Спринт",
        href: "/tournament/sprint",
        icon: Timer,
      },
      {
        label: "События",
        href: "/events",
        icon: CalendarDays,
      },
    ],
  },
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
