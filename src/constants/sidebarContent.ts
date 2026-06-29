import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CreditCard,
  FileText,
  Flame,
  FolderKanban,
  Gift,
  LinkIcon,
  Trophy,
  Puzzle,
  Settings,
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
} from "lucide-react";

export const menuItemsGen2 = [
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
    label: "Настройки сервиса",
    href: "/admin/app-settings",
    icon: Settings,
  },
  {
    label: "Маскот",
    href: "/mascot",
    icon: Bot,
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

// Allow-list of routes a `marketing`-only user may access. Used to
// filter the sidebar/header and to gate routes in ProtectedRoute.
// Keep in sync with the backend `allow_admin_or_marketing` surface
// (/admin/analytics/* + /admin/notifications/send).
export const MARKETING_PATHS = ["/marketing", "/push"] as const;

// True when an href belongs to the marketing allow-list (handles both
// exact matches and nested sub-paths like "/marketing/foo").
export const isMarketingPath = (href: string): boolean =>
  MARKETING_PATHS.some(
    (p) => href === p || href.startsWith(`${p}/`),
  );

export const menuItemsGen1 = [
  { label: "Связки предметов", href: "/subject-combinations", icon: LinkIcon },
  { label: "Тренажеры", href: "/trainers", icon: Dumbbell },
  { label: "Предметы", href: "/subjects", icon: BookOpen },
  { label: "Темы", href: "/topics", icon: FolderKanban },
  { label: "Вопросы", href: "/questions", icon: FileText },
  { label: "Черновики вопросов", href: "/question-drafts", icon: FileStack },
  { label: "Промокоды", href: "/promocodes", icon: CreditCard },
];
