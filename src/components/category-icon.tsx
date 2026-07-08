import {
  Banknote,
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Circle,
  CircleEllipsis,
  CircleParking,
  Clapperboard,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  PawPrint,
  Phone,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";

// Daftar ikon yang bisa dipilih user untuk kategori.
// Disimpan di DB sebagai string nama ikon.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  "circle-parking": CircleParking,
  "shopping-cart": ShoppingCart,
  shirt: Shirt,
  receipt: Receipt,
  house: House,
  wifi: Wifi,
  phone: Phone,
  smartphone: Smartphone,
  "gamepad-2": Gamepad2,
  clapperboard: Clapperboard,
  plane: Plane,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  baby: Baby,
  "paw-print": PawPrint,
  sparkles: Sparkles,
  gift: Gift,
  banknote: Banknote,
  briefcase: Briefcase,
  "hand-coins": HandCoins,
  "trending-up": TrendingUp,
  "circle-ellipsis": CircleEllipsis,
  circle: Circle,
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[icon] ?? Circle;
  return <Icon className={className} />;
}
