import { useState, useCallback, useRef } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    const duration = type === 'error' ? 5000 : 2000
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, show, dismiss }
}

export type ToastContext = ReturnType<typeof useToast>
