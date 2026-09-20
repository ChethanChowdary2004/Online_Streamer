import { Link, useParams } from 'react-router-dom'
import { getAnimeDetail } from '../api'
import useFetch from '../hooks/useFetch'
import AnimeRow from '../components/AnimeRow'
import { animeTitle } from '../components/AnimeCard'

const FORMAT_LABELS = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
}

// Anime metadata page — mirrors TvDetail. "Watch" links out to /watch/anime/:id
// (PlayerPage), where the AniList ID + chosen episode feed the VIDEASY embed.
export default function AnimeDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => getAnimeDetail(id), [id])

  if (loading) return <div className="spinner" />
  if (error || !data?.Media)
    return <div className="error-box">Couldn't load this anime: {error?.message}</div>

  const m = data.Media
  const title = animeTitle(m.title)
  const year = m.startDate?.year
  const isMovie = m.format === 'MOVIE'
  const backdrop = m.bannerImage || m.coverImage?.extraLarge || m.coverImage?.large
  const studio =
    m.studios?.nodes?.find((s) => s.isAnimationStudio)?.name || m.studios?.nodes?.[0]?.name
  const formatLabel = FORMAT_LABELS[m.format] || m.format
  const relations = (m.relations?.nodes || []).filter((r) => r.type === 'ANIME')

  return (
    <>
      <div className="detail">
        <div
          className="detail-backdrop"
          style={{ backgroundImage: `url(${backdrop})` }}
        />
        <div className="detail-content">
          <h1>{title}</h1>
          <div className="detail-meta">
            {m.averageScore && <span className="rating">★ {Math.round(m.averageScore)}</span>}
            {year && <span>{year}</span>}
            {formatLabel && <span>{formatLabel}</span>}
            {m.episodes ? <span>{m.episodes} episodes</span> : null}
            {studio && <span>{studio}</span>}
          </div>
          {(m.genres || []).length > 0 && (
            <div className="detail-genres">
              {m.genres.map((g) => (
                <span key={g} className="chip">
                  {g}
                </span>
              ))}
            </div>
          )}
          {m.description && (
            <p
              className="detail-overview"
              dangerouslySetInnerHTML={{ __html: m.description }}
            />
          )}
          <div className="hero-actions">
            <Link
              className="btn btn-play"
              to={`/watch/anime/${m.id}`}
              state={{ title, year }}
            >
              ▶ {isMovie ? 'Watch Movie' : 'Watch'}
            </Link>
          </div>
        </div>
      </div>

      {relations.length > 0 && <AnimeRow title="Related Anime" items={relations} />}
    </>
  )
}