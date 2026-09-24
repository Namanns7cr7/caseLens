import {
  AlertTriangle,
  Anchor,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bookmark,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Compass,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  Filter,
  FolderOpen,
  Gavel,
  GitCompareArrows,
  Grid3x3,
  Hash,
  History,
  Home,
  Info,
  Layers,
  Link2,
  Loader2,
  type LucideIcon,
  Maximize2,
  Menu,
  Minus,
  Network,
  Plus,
  Quote,
  Scale,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Table2,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The Stitch reference uses Material Symbols Outlined via `data-icon` names.
 * We keep the same semantic glyph vocabulary but render it from a bundled,
 * outlined icon set so the app has no runtime dependency on an external
 * icon stylesheet. Names below mirror the Stitch `data-icon` values.
 */
const ICONS = {
  account_balance: Building2,
  account_tree: Network,
  add_circle: Plus,
  analytics: TrendingUp,
  anchor: Anchor,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  auto_awesome: Sparkles,
  bookmark: Bookmark,
  bookmark_add: BookMarked,
  calendar_month: Calendar,
  check: Check,
  check_circle: CheckCircle2,
  chevron_right: ChevronRight,
  close: X,
  compare_arrows: GitCompareArrows,
  content_copy: Copy,
  delete: Trash2,
  expand_more: ChevronDown,
  explore: Compass,
  file_download: Download,
  file_search: FileSearch,
  folder_open: FolderOpen,
  format_quote: Quote,
  gavel: Gavel,
  grid_view: Grid3x3,
  groups: Users,
  hash: Hash,
  history: History,
  history_edu: Scale,
  home: Home,
  hub: Network,
  info: Info,
  layers: Layers,
  link: Link2,
  menu: Menu,
  menu_book: BookOpen,
  open_in_new: ExternalLink,
  payments: Banknote,
  person: User,
  progress_activity: Loader2,
  push_pin: Target,
  remove: Minus,
  report_problem: AlertTriangle,
  search: Search,
  settings: Settings,
  share: Share2,
  shield: Shield,
  shield_alert: ShieldAlert,
  table_view: Table2,
  trending_up: TrendingUp,
  tune: Filter,
  upload: Upload,
  verified: BadgeCheck,
  view_agenda: Layers,
  warning: AlertTriangle,
  cancel: XCircle,
  circle: CircleDot,
  schedule: Clock,
  description: FileText,
  fullscreen: Maximize2,
  zoom_in: ZoomIn,
  zoom_out: ZoomOut,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
    />
  );
}
