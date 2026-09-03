import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'

// Best available title. AniList stores several variants; prefer the English
// name, falling back to romaji/native.
export function animeTitle(t) {
  return t?.english || t?.romaji || t?.native || 'Untitled'
}

// Anime poster/banner fields on AniList are absolute URLs (coverImage.large,
// coverImage.extraLarge, bannerImage) so they are used directly — no TMDB
// imageUrl() mapping.
export default function AnimeCard({ item }) {
  const id = item.id
  const title = animeTitle(item.title)
  const rating = item.averageScore ? Math.round(item.averageScore) : null
  const year = item.startDate?.year
  const poster = item.coverImage?.large || item.coverImage?.extraLarge

  return (
    <div className="card">
      <div className="card-poster-wrapper">
        <Link to={`/anime/${id}`} className="card-poster">
          {poster ? (
            <img src={poster} alt={title} loading="lazy" />
          ) : (
            <div className="card-img placeholder">{title.slice(0, 1)}</div>
          )}
        </Link>
        <FavoriteButton
          contentType="anime"
          contentId={id}
          title={title}
          posterPath={poster}
        />
      </div>
      <div className="card-title">{title}</div>
      <div className="card-meta">
        {rating && <span className="rating">★ {rating}</span>}
        {year && <span>{year}</span>}
      </div>
    </div>
  )
}