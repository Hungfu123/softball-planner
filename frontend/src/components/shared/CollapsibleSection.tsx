import { useState } from 'react'

interface Props {
  title: string
  defaultOpen?: boolean
  count?: number
  children: React.ReactNode
}

export function CollapsibleSection({ title, defaultOpen = false, count, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-4 cursor-pointer group"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-950 group-hover:text-navy-700 transition-colors">
          {title}
        </h2>
        {count != null && (
          <span className="text-sm text-gray-400 font-normal">({count})</span>
        )}
      </button>
      {open && children}
    </section>
  )
}
