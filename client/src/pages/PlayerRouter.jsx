import { useParams } from 'react-router-dom'
import MoviePlayerPage from './MoviePlayerPage'
import SeriesPlayerPage from './SeriesPlayerPage'
import AnimePlayerPage from './AnimePlayerPage'

export default function PlayerRouter() {
  const { type, id } = useParams()

  if (type === 'movie') return <MoviePlayerPage tmdbId={id} />
  if (type === 'tv') return <SeriesPlayerPage tmdbId={id} />
  if (type === 'anime') return <AnimePlayerPage anilistId={id} />

  return (
    <div className="vplayer-error">
      <h3>Unsupported media</h3>
      <p>This media type can't be watched here.</p>
    </div>
  )
}
