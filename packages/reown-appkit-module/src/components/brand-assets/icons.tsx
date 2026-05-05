"use client";

import { cn } from '@/lib/utils';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Book,
  BookOpen,
  Brain,
  Briefcase,
  Building,
  Building2,
  Calculator,
  CheckSquare,
  Circle,
  Code,
  Coins,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Dot,
  Edit,
  Facebook,
  FileCode,
  FilePlus,
  FileSearch,
  FileText,
  FlaskConical,
  Gamepad,
  Gamepad2,
  Gem,
  GitBranch,
  GridIcon,
  Heart,
  HelpCircle,
  Home,
  Image,
  Info,
  Instagram,
  Joystick,
  LayoutDashboard,
  Layers,
  LineChart,
  Link,
  Linkedin,
  List,
  Lock,
  LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Network,
  Package,
  PieChart,
  Play,
  Plug,
  Receipt,
  RefreshCw,
  Repeat,
  Rocket,
  Scale,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sparkles,
  Star,
  Store,
  Tag,
  Target,
  TestTube,
  TrendingUp,
  Twitter,
  User,
  UserCircle,
  Users,
  Wallet,
  Wrench,
  Zap
} from 'lucide-react';

// Icon mapping for consistent usage
const iconMap: Record<string, LucideIcon> = {
  // Navigation Icons
  home: Home,
  'shopping-bag': ShoppingBag,
  marketplace: ShoppingBag,
  'layout-dashboard': LayoutDashboard,
  dashboard: LayoutDashboard,
  user: User,
  profile: User,
  settings: Settings,
  'book-open': BookOpen,
  blog: BookOpen,
  info: Info,
  about: Info,
  mail: Mail,
  contact: Mail,
  'help-circle': HelpCircle,
  help: HelpCircle,
  
  // Feature Icons
  brain: Brain,
  ai: Brain,
  shield: Shield,
  security: Shield,
  crown: Crown,
  premium: Crown,
  gem: Gem,
  luxury: Gem,
  zap: Zap,
  tiger: Zap,
  wrench: Wrench,

  // Social Icons
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,

  // Additional Icons
  'file-text': FileText,
  'file-plus': FilePlus,
  edit: Edit,
  lock: Lock,
  'map-pin': MapPin,
  image: Image,
  'refresh-cw': RefreshCw,
  'file-code': FileCode,

  // Admin Icons
  'grid-3x3': GridIcon,
  'bar-chart': BarChart3,
  users: Users,
  building: Building,
  'building-2': Building2,
  'dollar-sign': DollarSign,
  'trending-up': TrendingUp,
  'gamepad-2': Gamepad2,
  link: Link,
  database: Database,
  'shield-check': ShieldCheck,
  coins: Coins,
  briefcase: Briefcase,
  'arrow-down-circle': ArrowDownCircle,
  wallet: Wallet,
  bell: Bell,
  gamepad: Gamepad,
  joystick: Joystick,
  'credit-card': CreditCard,
  payment: CreditCard,
  card: CreditCard,
  
  // Additional Admin Icons
  rocket: Rocket,
  sparkles: Sparkles,
  'arrow-right': ArrowRight,
  network: Network,
  package: Package,
  'circle-dot': Dot,
  server: Server,
  flow: GitBranch,
  receipt: Receipt,
  calculator: Calculator,
  
  // Missing icons from navigation config
  code: Code,
  scale: Scale,
  'file-search': FileSearch,
  book: Book,
  'flask-conical': FlaskConical,
  'test-tube': TestTube,
  'line-chart': LineChart,
  target: Target,
  'alert-triangle': AlertTriangle,
  'pie-chart': PieChart,
  sliders: Sliders,
  activity: Activity,
  plug: Plug,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  circle: Circle,
  repeat: Repeat,
  play: Play,
  'check-square': CheckSquare,
  store: Store,
  'shopping-cart': ShoppingCart,
  list: List,
  heart: Heart,
  star: Star,
  tag: Tag,
  'user-circle': UserCircle,
  layers: Layers,
  'alert-circle': AlertCircle,
};

interface BrandIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'muted';
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

const variantMap = {
  default: 'text-current',
  primary: 'text-current',
  secondary: 'text-current',
  accent: 'text-current',
  muted: 'text-current',
  inherit: 'text-current', // Use current text color
};

export function BrandIcon({ 
  name, 
  size = 'md', 
  className,
  variant = 'default'
}: BrandIconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  return (
    <IconComponent 
      className={cn(
        sizeMap[size],
        variantMap[variant],
        className
      )}
    />
  );
}

// Specialized icon components
export function NavigationIcon({ name, className }: { name: string; className?: string }) {
  return (
    <BrandIcon
      name={name}
      size="md"
      variant="primary"
      className={cn("transition-colors", className)}
    />
  );
}

export function FeatureIcon({ name, className }: { name: string; className?: string }) {
  return (
    <BrandIcon 
      name={name} 
      size="lg" 
      variant="primary"
      className={cn("shadow-luxury", className)}
    />
  );
}

export function SocialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <BrandIcon 
      name={name} 
      size="md" 
      variant="primary"
      className={cn("hover:text-primary transition-colors", className)}
    />
  );
}

// Icon with text component
interface IconWithTextProps {
  icon: string;
  text: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'muted' | 'inherit' | 'ghost';
  className?: string;
  iconPosition?: 'left' | 'right' | 'top' | 'bottom';
}

export function IconWithText({ 
  icon, 
  text, 
  size = 'md',
  variant = 'primary',
  className,
  iconPosition = 'left'
}: IconWithTextProps) {
  const iconSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  
  const containerClasses = cn(
    "flex items-center gap-2",
    iconPosition === 'right' && "flex-row-reverse",
    iconPosition === 'top' && "flex-col",
    iconPosition === 'bottom' && "flex-col-reverse",
    className
  );

  return (
    <div className={containerClasses}>
      <BrandIcon name={icon} size={iconSize} variant={variant === 'inherit' ? 'default' : variant === 'ghost' ? 'muted' : 'default'} />
      <span className={cn(
        "luxury-text",
        size === 'sm' && "text-sm",
        size === 'lg' && "text-lg",
        "text-base",
        variant === 'inherit' ? 'text-current' : variant === 'ghost' ? 'text-muted-foreground' : variantMap[variant]
      )}>
        {text}
      </span>
    </div>
  );
}

// Icon button component
interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'ghost' | 'inherit';
  className?: string;
  disabled?: boolean;
  tooltip?: string;
}

export function IconButton({ 
  icon, 
  onClick, 
  size = 'md',
  variant = 'primary',
  className,
  disabled = false,
  tooltip
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const variantClasses = {
    default: 'bg-background hover:bg-accent text-foreground',
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    secondary: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
    accent: 'bg-accent hover:bg-accent/90 text-accent-foreground',
    ghost: 'hover:bg-accent text-foreground',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-border transition-all duration-200",
        "hover:shadow-luxury text-foreground hover:text-foreground focus:outline-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <BrandIcon name={icon} size={size} variant={variant === 'ghost' ? 'muted' : variant === 'inherit' ? 'primary' : 'default'  } />
    </button>
  );
}
