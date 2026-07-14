import { useState, useEffect, useCallback } from 'react'
import type { WhatsappPollResponse, WhatsappAccountStatus, WhatsappGroup, WhatsappPollRequest } from '@/types'
import * as api from '@/api/client'

export function useWhatsappPoll() {
  const [polls, setPolls] = useState<WhatsappPollResponse[]>([])
  const [status, setStatus] = useState<WhatsappAccountStatus | null>(null)
  const [groups, setGroups] = useState<WhatsappGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([api.getWhatsappStatus(), api.getWhatsappPolls()])
      setStatus(s)
      setPolls(p)
      setGroups(s.connected ? await api.getWhatsappGroups() : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createPoll = async (data: WhatsappPollRequest) => {
    const poll = await api.createWhatsappPoll(data)
    setPolls(prev => [...prev, poll])
    return poll
  }
  const updatePoll = async (id: number, data: WhatsappPollRequest) => {
    const poll = await api.updateWhatsappPoll(id, data)
    setPolls(prev => prev.map(p => p.id === id ? poll : p))
    return poll
  }
  const deletePoll = async (id: number) => {
    await api.deleteWhatsappPoll(id)
    setPolls(prev => prev.filter(p => p.id !== id))
  }
  const sendNow = (id: number) => api.sendWhatsappPollNow(id)
  const addSkipDate = async (id: number, date: string) => {
    const poll = await api.addWhatsappPollSkipDate(id, date)
    setPolls(prev => prev.map(p => p.id === id ? poll : p))
    return poll
  }
  const removeSkipDate = async (id: number, date: string) => {
    const poll = await api.removeWhatsappPollSkipDate(id, date)
    setPolls(prev => prev.map(p => p.id === id ? poll : p))
    return poll
  }

  const resetSent = async (id: number) => {
    const poll = await api.resetWhatsappPollSent(id)
    setPolls(prev => prev.map(p => p.id === id ? poll : p))
    return poll
  }

  return {
    polls, status, groups, loading, error, reload: load,
    createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate, resetSent,
  }
}
