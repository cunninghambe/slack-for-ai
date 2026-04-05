import { useState, useEffect, useCallback } from 'react'
import type { Channel } from '../types'
import { getChannels as apiGetChannels, createChannel as apiCreateChannel } from '../api/client'

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGetChannels()
      .then((ch) => {
        setChannels(ch)
        if (ch.length > 0) setActiveChannelId(ch[0].id)
      })
      .catch((err) => setError('Failed to load channels: ' + err.message))
      .finally(() => setLoading(false))
  }, [])

  const selectChannel = useCallback((id: string) => {
    setActiveChannelId(id)
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, unreadCount: 0 } : c))
  }, [])

  const createChannel = useCallback(async (name: string, description: string, type: 'public' | 'private') => {
    const ch = await apiCreateChannel(name, description, type)
    setChannels((prev) => [...prev, ch])
    setActiveChannelId(ch.id)
    return ch
  }, [])

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

  return { channels, activeChannel, activeChannelId, loading, error, selectChannel, createChannel, setChannels, setActiveChannelId }
}
