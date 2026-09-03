import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const WATCH_THRESHOLD_MS = 20000

export default function useWatchHistory(contentType, contentId, title, posterPath, seasonNumber, episodeNumber) {
  const { user } = useAuth()
  const latestRef = useRef({})
  latestRef.current = { contentType, contentId, title, posterPath, seasonNumber, episodeNumber }
  const loggedKeyRef = useRef(null)

  useEffect(() => {
    if (!user || !contentId) return

    const timer = setTimeout(async () => {
      const { contentType, contentId, title, posterPath, seasonNumber, episodeNumber } = latestRef.current
      if (!title) return

      const season = seasonNumber ?? 0
      const episode = episodeNumber ?? 0
      const key = `${contentType}-${contentId}-${season}-${episode}`
      if (loggedKeyRef.current === key) return

      try {
        const { error } = await supabase.from('watch_history').upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            title,
            poster_path: posterPath || '',
            season_number: season,
            episode_number: episode,
            watched_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,content_type,content_id,season_number,episode_number' }
        )
        if (error) throw error
        loggedKeyRef.current = key
      } catch (err) {
        console.error('Failed to log watch history:', err)
      }
    }, WATCH_THRESHOLD_MS)

    return () => clearTimeout(timer)
  }, [user, contentType, contentId, seasonNumber, episodeNumber])
}
