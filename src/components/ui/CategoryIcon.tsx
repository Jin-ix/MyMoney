import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Heart,
  Gamepad2,
  GraduationCap,
  ShoppingCart,
  Home,
  Shield,
  CreditCard,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  Banknote,
  Smartphone,
  Building2,
  Wallet,
  PiggyBank,
  Plane,
  Target,
  Repeat,
  CircleDollarSign,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
}

const ICON_MAP = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Heart,
  Gamepad2,
  GraduationCap,
  ShoppingCart,
  Home,
  Shield,
  CreditCard,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  Banknote,
  Smartphone,
  Building2,
  Wallet,
  PiggyBank,
  Plane,
  Target,
  Repeat,
};

export function CategoryIcon({ name, size = 20, className = '' }: CategoryIconProps) {
  const IconComponent = ICON_MAP[name as keyof typeof ICON_MAP] ?? CircleDollarSign;
  return <IconComponent size={size} className={className} aria-hidden="true" />;
}
