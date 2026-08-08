import { Link } from 'react-router-dom'
import { imageUrl } from '../api'

// Full-width featured content at the top of the home page.
export default function HeroBanner({ item }) {
  if (!item) return null

  const type = item.media_type || 'movie'
  const title = item.title || item.name || 'Untitled'
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR'
  const year = (item.release_date || item.first_air_date || '').slice(0, 4)
  const backdrop =
    imageUrl(item.backdrop_path, 'original') || imageUrl(item.poster_path, 'w500')
  const to = type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`

  return (
    <div className="hero">
      <div
        className="hero-backdrop"
        style={{ backgroundImage: `url(${backdrop})` }}
      />
      <div className="hero-content">
        <div className="hero-badges">
          <span className="rating">★ {rating}</span>
          {year && <span>{year}</span>}
          {item.media_type === 'tv' && <span>Series</span>}
        </div>
        <h1>{title}</h1>
        {item.overview && <p>{item.overview}</p>}
        <div className="hero-actions">
          <Link
            className="btn btn-play"
            to={`/watch/${type}/${item.id}`}
            state={{ title, year }}
          >
            ▶ Play
          </Link>
          <Link className="btn btn-ghost" to={to}>
            More Info
          </Link>
        </div>
      </div>
    </div>
  )
}