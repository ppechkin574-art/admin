import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
  FolderKanban,
  LinkIcon,
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
  {
    label: "Фичи подписки",
    href: "/content/subscription-benefits",
    icon: Sparkles,
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
