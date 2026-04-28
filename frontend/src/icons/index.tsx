/**
 * Icon-Facade — re-exports Lucide-React icons under unified names.
 * Custom SVGs only kept where Lucide has no good equivalent (Brand-Identity, Baseball-spezifisch).
 */
export { SkullLogo } from './SkullLogo'

import {
  CirclePlus,
  Pencil as LucidePencil,
  Trash2,
  ChevronLeft as LucideChevronLeft,
  ChevronUp as LucideChevronUp,
  ChevronDown as LucideChevronDown,
  GripVertical,
  CheckCircle2,
  TriangleAlert,
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
  ChevronRight as LucideChevronRight,
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
export const AlertTriangle = (p: IconProps) => <TriangleAlert size={p.size ?? 20} className={p.className} />
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
export const ChevronRight = (p: IconProps) => <LucideChevronRight size={p.size ?? 16} className={p.className} />

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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 4l6 6-7 7-4-4 5-5z" />
      <path d="M9 13l-5 5" />
      <path d="M5 19l-1 1" />
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
