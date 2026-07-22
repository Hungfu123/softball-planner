import { useState, useCallback, useRef } from 'react'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
  duration: number
  action?: { label: string; onClick: () => void }
}

interface ShowOptions {
  duration?: number
  action?: { label: string; onClick: () => void }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, typeOrOptions?: 'success' | 'error' | ShowOptions, options?: ShowOptions) => {
    const id = nextId.current++
    let type: 'success' | 'error' = 'success'
    let opts: ShowOptions = {}

    if (typeof typeOrOptions === 'string') {
      type = typeOrOptions
      if (options) opts = options
    } else if (typeOrOptions && typeof typeOrOptions === 'object') {
      opts = typeOrOptions
    }

    const duration = opts.duration ?? (type === 'error' ? 5000 : 2000)
    setToasts(prev => [...prev.slice(-2), { id, message, type, duration, action: opts.action }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, show, dismiss }
}

export type ToastContext = ReturnType<typeof useToast>
