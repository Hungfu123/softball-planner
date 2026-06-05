import { useState, useEffect, useCallback } from 'react'
import type { InvitationResponse, InvitationRequest } from '@/types'
import * as api from '@/api/client'

export function useInvitations() {
  const [invitations, setInvitations] = useState<InvitationResponse[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvitations(await api.getInvitations()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (data: InvitationRequest) => {
    const inv = await api.createInvitation(data)
    setInvitations(prev => [inv, ...prev])
    return inv
  }
  const update = async (id: number, data: InvitationRequest) => {
    const inv = await api.updateInvitation(id, data)
    setInvitations(prev => prev.map(x => x.id === id ? inv : x))
    return inv
  }
  const duplicate = async (id: number) => {
    const inv = await api.duplicateInvitation(id)
    setInvitations(prev => [inv, ...prev])
    return inv
  }
  const remove = async (id: number) => {
    await api.deleteInvitation(id)
    setInvitations(prev => prev.filter(x => x.id !== id))
  }

  return { invitations, loading, create, update, duplicate, remove, reload: load }
}
