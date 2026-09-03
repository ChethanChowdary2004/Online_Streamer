import { Link, useNavigate } from 'react-router-dom'
import { imageUrl } from '../api'
import FavoriteButton from './FavoriteButton'
import Skeleton from './Skeleton'

export default function ContinueWatchingRow({ items, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <section className="movie-row">
        <h2 className="row-title">CONTINUE WATCHING</h2>
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card">
              <Skeleton variant="card" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!items || items.length === 0) {
    return null
  }

  const handleCardClick = (item) => {
    navigate(`/watch/${item.content_type}/${item.content_id}`, {
      state: {
        resumeSeasonNumber: item.season_number,
        resumeEpisodeNumber: item.episode_number,
        resumeServerName: item.server_name,
      },
    })
  }

  return (
    <section className="movie-row">
      <h2 className="row-title">CONTINUE WATCHING</h2>
      <div className="grid">
        {items.map((item) => {
          const posterUrl =
            item.content_type === 'anime'
              ? item.poster_path
              : imageUrl(item.poster_path)

          const progressPercent =
            item.duration_seconds && item.duration_seconds > 0
              ? Math.min((item.progress_seconds / item.duration_seconds) * 100, 100)
              : 0

          const isSeries =
            item.content_type === 'series' || item.content_type === 'anime'
          const seasonEpisodeSuffix = isSeries
            ? ` (S${item.season_number})(E${item.episode_number})`
            : ''

          return (
            <div
              key={`${item.content_type}-${item.content_id}-${item.season_number}-${item.episode_number}`}
              className="card"
              onClick={() => handleCardClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardClick(item)
                }
              }}
            >
              <div className="card-poster-wrapper">
                <div className="card-poster">
                  {posterUrl ? (
                    <img src={posterUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="card-img placeholder">
                      {item.title.slice(0, 1)}
                    </div>
                  )}
                  {progressPercent > 0 && item.duration_seconds > 0 && (
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
                <FavoriteButton
                  contentType={item.content_type}
                  contentId={item.content_id}
                  title={item.title}
                  posterPath={item.poster_path}
                />
              </div>
              <div className="card-title">
                {item.title}
                {seasonEpisodeSuffix}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
