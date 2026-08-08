import { Link, useParams } from 'react-router-dom'
import { getTvDetail, imageUrl } from '../api'
import useFetch from '../hooks/useFetch'
import MovieRow from '../components/MovieRow'

export default function TvDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => getTvDetail(id), [id])

  if (loading) return <div className="spinner" />
  if (error || !data)
    return <div className="error-box">Couldn't load this series: {error?.message}</div>

  const show = data
  const name = show.name
  const year = (show.first_air_date || '').slice(0, 4)
  const backdrop = imageUrl(show.backdrop_path, 'w1280') || imageUrl(show.poster_path, 'w500')
  const cast = (data.credits?.cast || []).slice(0, 10)
  const similar = (data.similar?.results || []).slice(0, 20)

  return (
    <>
      <div className="detail">
        <div className="detail-backdrop" style={{ backgroundImage: `url(${backdrop})` }} />
        <div className="detail-content">
          <h1>{show.name}</h1>
          <div className="detail-meta">
            {show.vote_average > 0 && (
              <span className="rating">★ {show.vote_average.toFixed(1)}</span>
            )}
            {year && <span>{year}</span>}
            {show.number_of_seasons ? <span>{show.number_of_seasons} seasons</span> : null}
            {show.number_of_episodes ? <span>{show.number_of_episodes} episodes</span> : null}
          </div>
          {(show.genres || []).length > 0 && (
            <div className="detail-genres">
              {show.genres.map((g) => (
                <span key={g.id} className="chip">
                  {g.name}
                </span>
              ))}
            </div>
          )}
          {show.overview && <p className="detail-overview">{show.overview}</p>}
          <div className="hero-actions">
            <Link className="btn btn-play" to={`/watch/tv/${show.id}`} state={{ title: name, year }}>
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
          title="Similar Series"
          items={similar.map((s) => ({ ...s, media_type: 'tv' }))}
        />
      )}
    </>
  )
}