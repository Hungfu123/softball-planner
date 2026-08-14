/**
 * Icon-Facade — re-exports Lucide-React icons under unified names.
 * Custom SVGs only kept where Lucide has no good equivalent (Brand-Identity, Baseball-spezifisch).
 */
export { SkullLogo } from './SkullLogo'

import {
  ArrowLeftRight as LucideArrowLeftRight,
  CirclePlus,
  Pencil as LucidePencil,
  Trash2,
  ChevronLeft as LucideChevronLeft,
  ChevronUp as LucideChevronUp,
  ChevronDown as LucideChevronDown,
  GripVertical,
  CheckCircle2,
  CircleAlert,
  Upload,
  FileText,
  Car,
  X,
  Calendar as LucideCalendar,
  Star,
  Dices,
  ClipboardList as LucideClipboardList,
  Users,
  CircleDot,
  Footprints,
  Trophy,
  Frown,
  Zap,
  Send,
  EllipsisVertical,
  ChevronRight as LucideChevronRight,
  Flag,
  RotateCw,
  House,
  Building2,
  Plus,
  Minus,
  Share2,
  Tally5,
} from 'lucide-react'

interface IconProps {
  size?: number
  className?: string
}

// Lucide-Re-Exports unter den ursprünglichen Namen (Backward-Compat)
export const PlusCircle = (p: IconProps) => <CirclePlus size={p.size ?? 20} className={p.className} />
export const Pencil = (p: IconProps) => <LucidePencil size={p.size ?? 20} className={p.className} />
export const TrashBin = (p: IconProps) => <Trash2 size={p.size ?? 20} className={p.className} />
export const ChevronLeft = (p: IconProps) => <LucideChevronLeft size={p.size ?? 20} className={p.className} />
export const ChevronUp = (p: IconProps) => <LucideChevronUp size={p.size ?? 16} className={p.className} />
export const ChevronDown = (p: IconProps) => <LucideChevronDown size={p.size ?? 16} className={p.className} />
export const GripHandle = (p: IconProps) => <GripVertical size={p.size ?? 20} className={p.className} />
export const CheckCircle = (p: IconProps) => <CheckCircle2 size={p.size ?? 20} className={p.className} />
export const AlertCircle = (p: IconProps) => <CircleAlert size={p.size ?? 20} className={p.className} />
export const UploadIcon = (p: IconProps) => <Upload size={p.size ?? 20} className={p.className} />
export const ExportDoc = (p: IconProps) => <FileText size={p.size ?? 20} className={p.className} />
export const CarIcon = (p: IconProps) => <Car size={p.size ?? 20} className={p.className} />
export const XMark = (p: IconProps) => <X size={p.size ?? 16} className={p.className} />
export const CalendarIcon = (p: IconProps) => <LucideCalendar size={p.size ?? 20} className={p.className} />
export const StarIcon = (p: IconProps) => <Star size={p.size ?? 20} className={p.className} />
export const DiceIcon = (p: IconProps) => <Dices size={p.size ?? 20} className={p.className} />
export const ClipboardIcon = (p: IconProps) => <LucideClipboardList size={p.size ?? 20} className={p.className} />
export const ClipboardListIcon = (p: IconProps) => <LucideClipboardList size={p.size ?? 20} className={p.className} />
export const UsersIcon = (p: IconProps) => <Users size={p.size ?? 20} className={p.className} />
export const BallIcon = (p: IconProps) => <CircleDot size={p.size ?? 20} className={p.className} />
export const FootstepsIcon = (p: IconProps) => <Footprints size={p.size ?? 20} className={p.className} />
export const TrophyIcon = (p: IconProps) => <Trophy size={p.size ?? 20} className={p.className} />
export const BoltIcon = (p: IconProps) => <Zap size={p.size ?? 20} className={p.className} />
export const SadFaceIcon = (p: IconProps) => <Frown size={p.size ?? 20} className={p.className} />
export const SendIcon = (p: IconProps) => <Send size={p.size ?? 16} className={p.className} />
export const DotsVertical = (p: IconProps) => <EllipsisVertical size={p.size ?? 16} className={p.className} />
export const ChevronRight = (p: IconProps) => <LucideChevronRight size={p.size ?? 16} className={p.className} />
export const CoachFlagIcon = (p: IconProps) => <Flag size={p.size ?? 14} className={p.className} />
export const ArrowsSwap = (p: IconProps) => <LucideArrowLeftRight size={p.size ?? 16} className={p.className} />
export const RefreshIcon = (p: IconProps) => <RotateCw size={p.size ?? 16} className={p.className} />
export const HomeStadiumIcon = (p: IconProps) => <House size={p.size ?? 16} className={p.className} />
export const AwayIcon = (p: IconProps) => <Building2 size={p.size ?? 16} className={p.className} />
export const PlusMark = (p: IconProps) => <Plus size={p.size ?? 16} className={p.className} />
export const MinusMark = (p: IconProps) => <Minus size={p.size ?? 16} className={p.className} />
export const ShareIcon = (p: IconProps) => <Share2 size={p.size ?? 20} className={p.className} />
export const CounterIcon = (p: IconProps) => <Tally5 size={p.size ?? 20} className={p.className} />

// Custom SVGs — keine Lucide-Equivalente passen (Brand/Baseball-spezifisch)
export function CrossBones({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" className={className}>
      <line x1="4" y1="4" x2="20" y2="20" />
      <line x1="20" y1="4" x2="4" y2="20" />
      <circle cx="4" cy="4" r="2" />
      <circle cx="20" cy="4" r="2" />
      <circle cx="4" cy="20" r="2" />
      <circle cx="20" cy="20" r="2" />
    </svg>
  )
}

export function BatIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
      strokeWidth="0.4" strokeLinejoin="round" className={className}>
      {/* Tapered barrel (fat at top-right, narrows toward handle), rounded tip */}
      <path d="M22 2 A 2.12 2.12 0 0 0 19 5 L 9.29 14.71 L 10.71 13.29 Z" />
      {/* Handle (thinner) */}
      <path d="M 10.71 13.29 L 4.35 19.65 L 3.65 20.35 L 9.29 14.71 Z" />
      {/* Knob */}
      <circle cx="3" cy="21" r="1.3" />
    </svg>
  )
}

export function StrikeoutIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className={className}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function SubstitutionIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 7h10l-3 -3" />
      <path d="M17 17h-10l3 3" />
    </svg>
  )
}
