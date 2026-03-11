export function SkullLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crossed bats behind everything */}
      <g stroke="white" strokeWidth="7" strokeLinecap="round">
        {/* Left bat: handle bottom-left, barrel top-right */}
        <line x1="18" y1="170" x2="170" y2="22" />
        <line x1="165" y1="18" x2="175" y2="26" strokeWidth="12" />
        <circle cx="20" cy="168" r="5" fill="white" stroke="none" />
        {/* Right bat: handle bottom-right, barrel top-left */}
        <line x1="182" y1="170" x2="30" y2="22" />
        <line x1="35" y1="18" x2="25" y2="26" strokeWidth="12" />
        <circle cx="180" cy="168" r="5" fill="white" stroke="none" />
      </g>

      {/* Baseball circle */}
      <circle cx="100" cy="100" r="72" fill="currentColor" stroke="white" strokeWidth="5" />

      {/* Baseball stitching — left side */}
      <g stroke="#CC2936" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M38 78 L48 84 L38 90" />
        <path d="M34 88 L44 94 L34 100" />
        <path d="M33 98 L43 104 L33 110" />
        <path d="M36 108 L46 114 L36 120" />
      </g>

      {/* Baseball stitching — right side */}
      <g stroke="#CC2936" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M162 78 L152 84 L162 90" />
        <path d="M166 88 L156 94 L166 100" />
        <path d="M167 98 L157 104 L167 110" />
        <path d="M164 108 L154 114 L164 120" />
      </g>

      {/* Skull cranium */}
      <path d="M58 95 C58 62 78 48 100 48 C122 48 142 62 142 95 C142 108 136 116 130 120 L128 128 L72 128 L70 120 C64 116 58 108 58 95Z" fill="white" />

      {/* Cheekbones / temple lines */}
      <path d="M62 100 C60 96 59 90 62 82" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M138 100 C140 96 141 90 138 82" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* Eye sockets */}
      <ellipse cx="82" cy="88" rx="12" ry="13" fill="currentColor" />
      <ellipse cx="118" cy="88" rx="12" ry="13" fill="currentColor" />

      {/* Nose */}
      <path d="M96 104 L100 112 L104 104" fill="currentColor" />
      <ellipse cx="100" cy="105" rx="5" ry="4" fill="currentColor" />

      {/* Jaw / teeth */}
      <rect x="74" y="122" rx="4" width="52" height="18" fill="white" stroke="currentColor" strokeWidth="1.5" />
      {/* Tooth lines */}
      <line x1="82" y1="122" x2="82" y2="140" stroke="currentColor" strokeWidth="1.5" />
      <line x1="90" y1="122" x2="90" y2="140" stroke="currentColor" strokeWidth="1.5" />
      <line x1="100" y1="122" x2="100" y2="140" stroke="currentColor" strokeWidth="1.5" />
      <line x1="110" y1="122" x2="110" y2="140" stroke="currentColor" strokeWidth="1.5" />
      <line x1="118" y1="122" x2="118" y2="140" stroke="currentColor" strokeWidth="1.5" />
      {/* Horizontal middle line for upper/lower teeth */}
      <line x1="74" y1="131" x2="126" y2="131" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
