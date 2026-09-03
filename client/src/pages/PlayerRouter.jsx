import { useParams, useLocation } from 'react-router-dom'
import MoviePlayerPage from './MoviePlayerPage'
import SeriesPlayerPage from './SeriesPlayerPage'
import AnimePlayerPage from './AnimePlayerPage'

export default function PlayerRouter() {
  const { type, id } = useParams()
  const location = useLocation()
  const resumeState = location.state || {}

  console.log('PlayerRouter:', { type, id, resumeState })

  if (type === 'movie') return <MoviePlayerPage tmdbId={id} resumeState={resumeState} />
  if (type === 'tv') return <SeriesPlayerPage tmdbId={id} resumeState={resumeState} />
  if (type === 'anime') return <AnimePlayerPage anilistId={id} resumeState={resumeState} />

  return (
    <div className="vplayer-error">
      <h3>Unsupported media</h3>
      <p>This media type can't be watched here.</p>
    </div>
  )
}
