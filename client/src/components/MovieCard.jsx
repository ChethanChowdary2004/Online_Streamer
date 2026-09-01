import { useState } from 'react'
import { Link } from 'react-router-dom'
import { imageUrl } from '../api'
import Skeleton from './Skeleton'

export default function MovieCard({ item, type }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const mediaType = type || item.media_type || 'movie'
  const id = item.id
  const title = item.title || item.name || 'Untitled'
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR'
  const year = (item.release_date || item.first_air_date || '').slice(0, 4)
  const poster = imageUrl(item.poster_path)
  const to = mediaType === 'tv' ? `/tv/${id}` : `/movie/${id}`

  return (
    <div className="card">
      <Link to={to} className="card-poster">
        {!imageLoaded && poster && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Skeleton variant="card" />
          </div>
        )}
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        ) : (
          <div className="card-img placeholder">{title.slice(0, 1)}</div>
        )}
      </Link>
      <div className="card-title">{title}</div>
      <div className="card-meta">
        <span className="rating">★ {rating}</span>
        {year && <span>{year}</span>}
      </div>
    </div>
  )
}