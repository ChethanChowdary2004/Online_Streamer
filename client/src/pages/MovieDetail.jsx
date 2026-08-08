import { Link, useParams } from 'react-router-dom'
import { getMovieDetail, imageUrl } from '../api'
import useFetch from '../hooks/useFetch'
import MovieRow from '../components/MovieRow'

export default function MovieDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => getMovieDetail(id), [id])

  if (loading) return <div className="spinner" />
  if (error || !data)
    return <div className="error-box">Couldn't load this movie: {error?.message}</div>

  const m = data
  const title = m.title
  const year = (m.release_date || '').slice(0, 4)
  const backdrop = imageUrl(m.backdrop_path, 'w1280') || imageUrl(m.poster_path, 'w500')
  const cast = (data.credits?.cast || []).slice(0, 10)
  const similar = (data.similar?.results || []).slice(0, 20)

  return (
    <>
      <div className="detail">
        <div className="detail-backdrop" style={{ backgroundImage: `url(${backdrop})` }} />
        <div className="detail-content">
          <h1>{m.title}</h1>
          <div className="detail-meta">
            {m.vote_average > 0 && <span className="rating">★ {m.vote_average.toFixed(1)}</span>}
            {year && <span>{year}</span>}
            {m.runtime ? <span>{m.runtime} min</span> : null}
          </div>
          {(m.genres || []).length > 0 && (
            <div className="detail-genres">
              {m.genres.map((g) => (
                <span key={g.id} className="chip">
                  {g.name}
                </span>
              ))}
            </div>
          )}
          {m.overview && <p className="detail-overview">{m.overview}</p>}
          <div className="hero-actions">
            <Link className="btn btn-play" to={`/watch/movie/${m.id}`} state={{ title, year }}>
              ▶ Play
            </Link>
          </div>
        </div>
      </div>

      {cast.length > 0 && (
        <section className="shelf">
          <h2>Cast</h2>
          <div className="cast">
            {cast.map((c) => {
              const p = imageUrl(c.profile_path, 'w185')
              return (
                <div key={c.id} className="cast-member">
                  {p ? (
                    <img src={p} alt={c.name} />
                  ) : (
                    <div className="cast-ph">{c.name?.[0]}</div>
                  )}
                  <div className="name">{c.name}</div>
                  <div className="role">{c.character}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <MovieRow
          title="Similar Movies"
          items={similar.map((s) => ({ ...s, media_type: 'movie' }))}
        />
      )}
    </>
  )
}