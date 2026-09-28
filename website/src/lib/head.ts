import { useEffect } from 'react'

type HeadOptions = {
  title: string
  description?: string
  noindex?: boolean
}

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useHead({ title, description, noindex = false }: HeadOptions) {
  useEffect(() => {
    document.title = title
    if (description) setMeta('description', description)
    setMeta('robots', noindex ? 'noindex' : 'index')
  }, [title, description, noindex])
}
