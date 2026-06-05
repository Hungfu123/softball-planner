interface IconProps { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, className,
})

export const LiveBatIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M5 19l4-4" /><path d="M9 15l7-7a3 3 0 0 0-4-4l-7 7" /><circle cx="18" cy="6" r="1.4" fill="currentColor" /></svg>
)
export const TeeIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="6" r="2.4" /><path d="M12 8.4V18" /><path d="M8 20h8" /></svg>
)
export const BuntIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M4 14h10" /><path d="M14 14l5-5" /><circle cx="6" cy="14" r="1.2" fill="currentColor" /></svg>
)
export const KorkenIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><rect x="9" y="3" width="6" height="6" rx="1" /><path d="M11 9v9" /><path d="M13 9v9" /><path d="M9 20h6" /></svg>
)
export const HuetchenIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M12 4l5 14H7z" /><path d="M5 18h14" /></svg>
)
export const OtherStationIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
)
