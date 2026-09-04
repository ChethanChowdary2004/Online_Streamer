import { useState } from 'react'
import { Link } from 'react-router-dom'
import { imageUrl } from '../api'
import Skeleton from './Skeleton'
import FavoriteButton from './FavoriteButton'

export default function MovieCard({ item, type }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const mediaType = type || item.media_type || 'movie'
  const id = item.id
  const title = item.title || item.name || 'Untitled'
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR'
  const year = (item.release_date || item.first_air_date || '').slice(0, 4)
  const poster = imageUrl(item.poster_path)
  const to = mediaType === 'tv' ? `/tv/${id}` : `/movie/${id}`
  const contentType = mediaType === 'tv' ? 'series' : 'movie'

  return (
    <div className="card">
      <div className="card-poster-wrapper">
        <Link to={to} className="card-poster">
          {!imageLoaded && poster && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <Skeleton variant="card" />
            </div>
          )}
          {poster ? (
            <>
              <img
                src={poster}
                alt={title}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
              />
              {rating && rating !== 'NR' && (
                <span className="rating-badge">★ {rating}</span>
              )}
            </>
          ) : (
            <div className="card-img placeholder">{title.slice(0, 1)}</div>
          )}
        </Link>
        <FavoriteButton
          contentType={contentType}
          contentId={id}
          title={title}
          posterPath={item.poster_path}
        />
      </div>
      <div className="card-title">{title}</div>
      <div className="card-meta">
        {year && <span>{year}</span>}
      </div>
    </div>
  )
}