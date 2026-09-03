import { useState } from 'react'
import {
  getMovieDetail,
  getStream,
} from '../api'
import useFetch from '../hooks/useFetch'
import useWatchHistory from '../hooks/useWatchHistory'
import useContinueWatching from '../hooks/useContinueWatching'
import VideoPlayer from '../components/VideoPlayer'
import MovieRow from '../components/MovieRow'
import AnimeRow from '../components/AnimeRow'

export default function MoviePlayerPage({ tmdbId, anilistId, animeRelations, videasyOnly = false, resumeState = {} }) {
  const [selectedServer, setSelectedServer] = useState(resumeState.resumeServerName || null)

  const { data, error, loading } = useFetch(async () => {
    const d = await getMovieDetail(tmdbId)
    const title = d.title || 'This title'
    const year = (d.release_date || '').slice(0, 4)
    const res = await getStream({ tmdbId, title, year, mediaType: 'movie' })
    return {
      title,
      year,
      servers: res.servers || [],
      overview: d.overview || '',
      similar: (d.similar && d.similar.results) || [],
      posterPath: d.poster_path,
      runtime: d.runtime,
    }
  }, [tmdbId])

  useWatchHistory('movie', tmdbId, data?.title || '', data?.posterPath || '')

  useContinueWatching(
    'movie',
    tmdbId,
    data?.title || '',
    data?.posterPath || '',
    undefined,
    undefined,
    selectedServer,
    data?.runtime ? data.runtime * 60 : null
  )

  if (loading) return <div className="player-loading">Loading stream…</div>

  if (error || !data?.servers?.length) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>
          "{data?.title || 'This title'}" couldn't be loaded. Try another title.
        </p>
      </div>
    )
  }

  let servers = data.servers
  if (videasyOnly) {
    servers = servers.filter((s) => s.id === 'videasy')
  }

  const handleServerChange = (serverId) => {
    if (serverId === 'auto') {
      setSelectedServer(null)
    } else {
      setSelectedServer(serverId)
    }
  }

  return (
    <div className="player-page">
      <VideoPlayer
        tmdbId={tmdbId}
        mediaType="movie"
        servers={servers}
        anilistId={anilistId}
        title={data.title}
        description={data.overview}
        selectedServer={selectedServer}
        onServerChange={handleServerChange}
      />
      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : (
        <MovieRow title="Similar Movies" items={data.similar} type="movie" />
      )}
    </div>
  )
}
