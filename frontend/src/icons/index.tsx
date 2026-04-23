export { SkullLogo } from './SkullLogo'

interface IconProps {
  size?: number
  className?: string
}

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

export function PlusCircle({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

export function Pencil({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.73 2.27a2.83 2.83 0 0 0-4 0L6.5 13.5 5 19l5.5-1.5L21.73 6.27a2.83 2.83 0 0 0 0-4zM15.5 4.5l4 4" />
    </svg>
  )
}

export function TrashBin({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 2a2 2 0 0 0-2 2v1H3.5a.75.75 0 0 0 0 1.5h1.02l.863 12.08A2.5 2.5 0 0 0 7.878 21h8.244a2.5 2.5 0 0 0 2.495-2.42L19.48 6.5h1.02a.75.75 0 0 0 0-1.5H16V4a2 2 0 0 0-2-2h-4zm4 3V4a.5.5 0 0 0-.5-.5h-3A.5.5 0 0 0 10 4v1h4z" clipRule="evenodd" />
    </svg>
  )
}

export function ChevronLeft({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function ChevronUp({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

export function ChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function GripHandle({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

export function CheckCircle({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  )
}

export function AlertTriangle({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function UploadIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export function ExportDoc({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.414a1 1 0 0 0-.293-.707l-6.414-6.414A1 1 0 0 0 12.586 1H6zm7 1.5V8a1 1 0 0 0 1 1h4.5L13 3.5zM8.5 13a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 8.5 13zm0 4a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 8.5 17z" clipRule="evenodd" />
    </svg>
  )
}

export function CarIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8.04 4a2 2 0 0 0-1.9 1.37L4.56 9H3a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h.17a3 3 0 0 0 5.66 0h6.34a3 3 0 0 0 5.66 0H21a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-1.56l-1.58-3.63A2 2 0 0 0 16.04 4H8.04zM7 17a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm13 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
    </svg>
  )
}

export function XMark({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function BatIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20l4-4" />
      <path d="M8 16l8.5-8.5c1.5-1.5 3.5-2 4.5-1s.5 3-1 4.5L12 19.5" />
    </svg>
  )
}

export function CalendarIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function StarIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function DiceIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.5" fill="white" />
      <circle cx="16" cy="8" r="1.5" fill="white" />
      <circle cx="12" cy="12" r="1.5" fill="white" />
      <circle cx="8" cy="16" r="1.5" fill="white" />
      <circle cx="16" cy="16" r="1.5" fill="white" />
    </svg>
  )
}

export function ClipboardIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  )
}

export function UsersIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function BallIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      {/* Stitching — zwei Kurven für den klassischen Softball-Look */}
      <path d="M4.5 7.5 Q 12 12, 4.5 16.5" strokeDasharray="1.5 2.2" />
      <path d="M19.5 7.5 Q 12 12, 19.5 16.5" strokeDasharray="1.5 2.2" />
    </svg>
  )
}

/** Fußabdruck-Paar für Walk. */
export function FootstepsIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 5c-1.4 0-2.5 1.3-2.5 3s.6 3 2 3.5 2.5-.5 2.5-2.5S8.4 5 7 5zm-.5 7.5c-.8 0-1.5.7-1.5 1.5v2c0 .8.7 1.5 1.5 1.5S8 16.8 8 16v-2c0-.8-.7-1.5-1.5-1.5z"/>
      <path d="M17 9c-1.4 0-2.5 1.3-2.5 3s.6 3 2 3.5 2.5-.5 2.5-2.5S18.4 9 17 9zm-.5 7.5c-.8 0-1.5.7-1.5 1.5v1c0 .8.7 1.5 1.5 1.5S18 19.8 18 19v-1c0-.8-.7-1.5-1.5-1.5z"/>
    </svg>
  )
}

/** Ball mit Motion-Lines — für Strikeout (Ball zieht am Batter vorbei). */
export function StrikeoutIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Ball */}
      <circle cx="15" cy="12" r="5" />
      {/* Stitching */}
      <path d="M11 10.5 Q 15 12, 11 13.5" strokeDasharray="1 1.5" strokeWidth="1.2" />
      {/* Motion-Lines links vom Ball */}
      <path d="M2 9h5" />
      <path d="M3 12h4" />
      <path d="M2 15h5" />
    </svg>
  )
}

/** Trophy/Pokal — feiert Run-Scoring (universell als "gescort!" verständlich). */
export function TrophyIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Pokal-Schale */}
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" fill="currentColor" fillOpacity="0.25" />
      {/* Griffe links/rechts */}
      <path d="M7 6H4v2a3 3 0 0 0 3 3" />
      <path d="M17 6h3v2a3 3 0 0 1-3 3" />
      {/* Stiel + Fuß */}
      <path d="M12 14v4" />
      <path d="M8 21h8" strokeWidth="2.5" />
      <path d="M9 18h6" />
    </svg>
  )
}

/** Trauriger Smiley — für Strikeout (Batter ist geknickt). */
export function SadFaceIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      {/* Augen */}
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
      {/* Trauriger Mund (nach unten gebogen) */}
      <path d="M8 16 Q 12 13, 16 16" />
    </svg>
  )
}
