import React from 'react';
import {
  Activity,
  Heart,
  HeartPulse,
  Shield,
  ShieldCheck,
  UserCheck,
  User,
  Users,
  Gift,
  Baby,
  Sparkles,
  ShoppingBag,
  Folder,
  FolderTree,
  HeartHandshake,
  PartyPopper,
  Stethoscope,
  Pill,
  Syringe,
  Thermometer,
  Smile,
  Flower2,
  Coffee,
  Cake,
  Sun,
  Moon,
  Star,
  Award,
  Zap,
  Plus,
  Tag,
  Package,
  Box,
  Truck,
  Eye,
  Home,
  Layers,
  HandHeart,
  Footprints,
  Glasses,
  Crown,
  Flame,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  heart: Heart,
  heartpulse: HeartPulse,
  shield: Shield,
  shieldcheck: ShieldCheck,
  usercheck: UserCheck,
  user: User,
  users: Users,
  gift: Gift,
  baby: Baby,
  sparkles: Sparkles,
  shoppingbag: ShoppingBag,
  folder: Folder,
  foldertree: FolderTree,
  hearthandshake: HeartHandshake,
  partypopper: PartyPopper,
  stethoscope: Stethoscope,
  pill: Pill,
  syringe: Syringe,
  thermometer: Thermometer,
  smile: Smile,
  flower: Flower2,
  flower2: Flower2,
  coffee: Coffee,
  cake: Cake,
  sun: Sun,
  moon: Moon,
  star: Star,
  award: Award,
  zap: Zap,
  plus: Plus,
  tag: Tag,
  package: Package,
  box: Box,
  truck: Truck,
  eye: Eye,
  home: Home,
  layers: Layers,
  handheart: HandHeart,
  footprints: Footprints,
  glasses: Glasses,
  crown: Crown,
  flame: Flame,
};

// Curated list for the icon picker
export const POPULAR_CATEGORY_ICONS = [
  { name: 'Activity', key: 'Activity', label: 'Clinical / Medical' },
  { name: 'Heart', key: 'Heart', label: 'Care & Love' },
  { name: 'Shield', key: 'Shield', label: 'Mobility & Protection' },
  { name: 'UserCheck', key: 'UserCheck', label: 'Elder & Personal' },
  { name: 'Stethoscope', key: 'Stethoscope', label: 'Diagnostics' },
  { name: 'Pill', key: 'Pill', label: 'Pharmacy & Meds' },
  { name: 'Gift', key: 'Gift', label: 'Hampers & Gifts' },
  { name: 'Baby', key: 'Baby', label: 'New Mum & Baby' },
  { name: 'HeartHandshake', key: 'HeartHandshake', label: 'Anniversary' },
  { name: 'Sparkles', key: 'Sparkles', label: 'Wedding & Luxury' },
  { name: 'PartyPopper', key: 'PartyPopper', label: 'Celebrations' },
  { name: 'HandHeart', key: 'HandHeart', label: 'Comfort Care' },
  { name: 'Flower2', key: 'Flower2', label: 'Florals & Mum' },
  { name: 'Coffee', key: 'Coffee', label: 'Artisanal & Dad' },
  { name: 'ShoppingBag', key: 'ShoppingBag', label: 'Shopping' },
  { name: 'Package', key: 'Package', label: 'Curated Kits' },
];

/**
 * Checks if a string is a single emoji character rather than an icon name
 */
function isEmoji(str: string): boolean {
  if (!str) return false;
  // Emoji regex detecting common Unicode emoji ranges
  const emojiRegex = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF])/u;
  return emojiRegex.test(str.trim()) && str.trim().length <= 4;
}

interface CategoryIconProps {
  icon?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'root' | 'child' | 'subchild' | 'picker';
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  className = '',
  size = 'md',
  variant = 'root',
}) => {
  const cleanIcon = (icon || '').trim();

  // If it's an emoji (e.g. 🩺, ❤️, 🎁, 👶)
  if (isEmoji(cleanIcon)) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none select-none ${
          size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base sm:text-lg'
        } ${className}`}
        aria-hidden="true"
      >
        {cleanIcon}
      </span>
    );
  }

  // Lookup in Icon Map (case insensitive)
  const normalizedKey = cleanIcon.toLowerCase().replace(/[^a-z0-9]/g, '');
  const IconComponent = CATEGORY_ICON_MAP[normalizedKey] || Folder;

  const iconSizeClass =
    size === 'lg'
      ? 'w-6 h-6 sm:w-7 sm:h-7'
      : size === 'sm'
      ? 'w-4 h-4'
      : 'w-5 h-5';

  return <IconComponent className={`${iconSizeClass} ${className}`} aria-hidden="true" />;
};

interface CategoryIconBadgeProps {
  icon?: string | null;
  variant?: 'root' | 'child' | 'subchild';
  className?: string;
}

export const CategoryIconBadge: React.FC<CategoryIconBadgeProps> = ({
  icon,
  variant = 'root',
  className = '',
}) => {
  if (variant === 'root') {
    return (
      <div
        className={`w-11 h-11 rounded-xl bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${className}`}
      >
        <CategoryIcon icon={icon} size="md" />
      </div>
    );
  }

  if (variant === 'child') {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-[#F1FAF3]/80 border border-[#8BCF9B]/40 text-[#237A3B] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      >
        <CategoryIcon icon={icon} size="sm" />
      </div>
    );
  }

  // subchild / depth 2+
  return (
    <div
      className={`w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 flex items-center justify-center shrink-0 ${className}`}
    >
      <CategoryIcon icon={icon} size="sm" />
    </div>
  );
};
