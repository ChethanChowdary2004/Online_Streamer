import { useState } from 'react'
import {
  getMovieDetail,
  getStream,
} from '../api'
import useFetch from '../hooks/useFetch'
import VideoPlayer from '../components/VideoPlayer'
import MovieRow from '../components/MovieRow'
import AnimeRow from '../components/AnimeRow'

export default function MoviePlayerPage({ tmdbId, anilistId, animeRelations, videasyOnly = false }) {
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
    }
  }, [tmdbId])

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

  return (
    <div className="player-page">
      <VideoPlayer
        tmdbId={tmdbId}
        mediaType="movie"
        servers={servers}
        anilistId={anilistId}
        title={data.title}
        description={data.overview}
      />
      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : (
        <MovieRow title="Similar Movies" items={data.similar} type="movie" />
      )}
    </div>
  )
}
