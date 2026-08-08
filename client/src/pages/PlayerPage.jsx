import { useParams } from 'react-router-dom'
import { getMovieDetail, getTvDetail, getStream } from '../api'
import useFetch from '../hooks/useFetch'
import VideoPlayer from '../components/VideoPlayer'

// Plays a title by resolving a lawful stream from TMDB metadata.
//   /watch/movie/:id | /watch/tv/:id
export default function PlayerPage() {
  const { type, id } = useParams()

  const { data, error, loading } = useFetch(() => {
    const detail = type === 'tv' ? getTvDetail(id) : getMovieDetail(id)
    return detail.then((d) => {
      const title = d.title || d.name || 'This title'
      const year = (d.release_date || d.first_air_date || '').slice(0, 4)
      return getStream({ tmdbId: id, title, year }).then((stream) => ({
        title,
        year,
        stream,
      }))
    })
  }, [type, id])

  if (loading) return <div className="player-loading">Loading stream…</div>

  // No lawful stream exists for this title.
  if (error || !data?.stream) {
    return (
      <div className="player-page">
        <div className="player-wrap player-error">
          <h2>No playable video here</h2>
          <p>
            &ldquo;{data?.title || 'This title'}&rdquo; isn&rsquo;t in our library of freely
            available films. Try another title — many public-domain classics play instantly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="player-page">
      <div className="player-wrap">
        <VideoPlayer src={data.stream.source || data.stream.url} type={data.stream.type} />
      </div>
      <h2 className="player-title">{data.title}</h2>
      <p className="player-sub">
        {data.year && `${data.year} · `}Streamed from {data.stream.sourceName || 'a free source'}
      </p>
    </div>
  )
}