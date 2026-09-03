import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const UPSERT_INTERVAL_MS = 15000

export default function useContinueWatching(
  contentType, contentId, title, posterPath,
  seasonNumber, episodeNumber, serverName, durationSeconds
) {
  const { user } = useAuth()
  const progressRef = useRef(0)
  const lastUpsertRef = useRef(0)

  useEffect(() => {
    if (!user || !contentId) return

    let cancelled = false
    progressRef.current = 0
    const season = seasonNumber ?? 0
    const episode = episodeNumber ?? 0

    const initializeProgress = async () => {
      try {
        const { data } = await supabase
          .from('continue_watching')
          .select('progress_seconds, season_number, episode_number')
          .eq('user_id', user.id)
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .single()

        if (!cancelled && data && data.season_number === season && data.episode_number === episode) {
          progressRef.current = data.progress_seconds || 0
        }
      } catch (err) {
        // no existing row for this exact episode — start at 0
      }
    }

    const upsertProgress = async () => {
      if (!title) return

      let progressToSave = progressRef.current
      if (durationSeconds && progressToSave > durationSeconds) {
        progressToSave = durationSeconds
      }

      try {
        await supabase.from('continue_watching').upsert(
          {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            title,
            poster_path: posterPath || '',
            season_number: season,
            episode_number: episode,
            server_name: serverName || '',
            progress_seconds: progressToSave,
            duration_seconds: durationSeconds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,content_type,content_id' }
        )
      } catch (err) {
        console.error('Failed to save progress:', err)
      }
    }

    initializeProgress()

    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        progressRef.current += 1
        const now = Date.now()
        if (now - lastUpsertRef.current >= UPSERT_INTERVAL_MS) {
          lastUpsertRef.current = now
          upsertProgress()
        }
      }
    }, 1000)

    const onBeforeUnload = () => upsertProgress()
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      cancelled = true
      clearInterval(tick)
      window.removeEventListener('beforeunload', onBeforeUnload)
      upsertProgress()
    }
  }, [user, contentType, contentId, title, posterPath, seasonNumber, episodeNumber, serverName, durationSeconds])
}
