import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  FileText,
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
} from "lucide-react";

export const menuItemsGen2 = [
  { label: "Модули", href: "/modules", icon: Puzzle },
  { label: "Пробное ЕНТ", href: "/ent-practice/subjects", icon: GraduationCap },
  { label: "Тренажёр по темам", href: "/trainer-v2/subjects", icon: Layers },
  { label: "Пользователи", href: "/users", icon: Users },
  { label: "Маркетинг", href: "/marketing", icon: BarChart3 },
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
    label: "Настройки сервиса",
    href: "/admin/app-settings",
    icon: Settings,
  },
];

export const menuItemsGen1 = [
  { label: "Связки предметов", href: "/subject-combinations", icon: LinkIcon },
  { label: "Тренажеры", href: "/trainers", icon: Dumbbell },
  { label: "Предметы", href: "/subjects", icon: BookOpen },
  { label: "Темы", href: "/topics", icon: FolderKanban },
  { label: "Вопросы", href: "/questions", icon: FileText },
  { label: "Промокоды", href: "/promocodes", icon: CreditCard },
];
