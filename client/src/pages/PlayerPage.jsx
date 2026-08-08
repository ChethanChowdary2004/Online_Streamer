import { useParams } from 'react-router-dom'
import { getMovieDetail, getTvDetail, getStream } from '../api'
import useFetch from '../hooks/useFetch'
import VideoPlayer from '../components/VideoPlayer'

// Plays a title using the WFS embed player.
// /watch/movie/:id | /watch/tv/:id

export default function PlayerPage() {
  const { type, id } = useParams()

  const { data, error, loading } = useFetch(() => {
    const detail =
      type === 'tv'
        ? getTvDetail(id)
        : getMovieDetail(id)

    return detail.then((d) => {
      const title = d.title || d.name || 'This title'
      const year = (
        d.release_date ||
        d.first_air_date ||
        ''
      ).slice(0, 4)

      return getStream({
        tmdbId: id,
        title,
        year,
      }).then((stream) => ({
        title,
        year,
        stream,
      }))
    })
  }, [type, id])

  if (loading) {
    return <div>Loading stream…</div>
  }

  if (error || !data?.stream) {
    return (
      <div>
        <h2>No playable video here</h2>
        <p>
          “{data?.title || 'This title'}” couldn’t be loaded.
          Try another title.
        </p>
      </div>
    )
  }

  return (
    <div>
      <VideoPlayer
        tmdbId={data.stream.tmdbId || id}
        mediaType={type === 'tv' ? 'tv' : 'movie'}
      />

      <h2>{data.title}</h2>

      {data.year && `${data.year} · `}

      Streamed from {data.stream.sourceName || 'WFS'}
    </div>
  )
}