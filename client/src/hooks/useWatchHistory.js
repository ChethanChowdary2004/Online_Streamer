import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function useWatchHistory(contentType, contentId, title, posterPath, seasonNumber, episodeNumber) {
  const { user } = useAuth()
  const loggedRef = useRef(false)

  useEffect(() => {
    if (!user || !contentId || !title || loggedRef.current) {
      return
    }

    loggedRef.current = true

    const logToHistory = async () => {
      try {
        const { error } = await supabase.from('watch_history').upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            title,
            poster_path: posterPath || '',
            season_number: seasonNumber ?? 0,
            episode_number: episodeNumber ?? 0,
            watched_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,content_type,content_id,season_number,episode_number',
          }
        )
        if (error) throw error
        console.log('Watch history logged successfully:', { contentType, contentId, title })
      } catch (err) {
        console.error('Failed to log watch history:', err)
        loggedRef.current = false
      }
    }

    logToHistory()
  }, [user, contentType, contentId, title, posterPath, seasonNumber, episodeNumber])
}


