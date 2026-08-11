import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { animeTitle } from './AnimeCard'

const SLIDE_MS = 7000
const MAX_SLIDES = 5

// Full-width featured slideshow at the top of the anime page. Mirrors
// HeroBanner but consumes AniList's raw Media shape: bannerImage cover URL,
// romaji/english title, averageScore (0-100). Every slide links to the anime
// detail page, which hosts the episode picker + VIDEASY embed.
export default function AnimeHeroBanner({ items }) {
  const anime = (items || []).slice(0, MAX_SLIDES)
  const count = anime.length
  const [index, setIndex] = useState(0)

  // Auto-advance; the timer resets on every slide change (incl. manual nav).
  useEffect(() => {
    if (count <= 1) return undefined
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearTimeout(t)
  }, [index, count])

  if (count === 0) return null

  const cur = index % count
  const prev = (cur - 1 + count) % count
  const next = (cur + 1) % count
  const item = anime[cur]
  const go = (i) => setIndex(((i % count) + count) % count)

  const title = animeTitle(item.title)
  const rating = item.averageScore ? Math.round(item.averageScore) : null
  const year = item.startDate?.year
  const isMovie = item.format === 'MOVIE'
  const watchTo = `/watch/anime/${item.id}`
  const infoTo = `/anime/${item.id}`

  return (
    <section
      className="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="Trending anime"
    >
      {anime.map((m, i) => {
        // Only load the current + upcoming backdrops to keep the hero light.
        const on = i === cur || i === next
        const bg = m.bannerImage || m.coverImage?.extraLarge || m.coverImage?.large
        const src = on ? bg : undefined
        return (
          <div
            key={m.id}
            className={`hero-slide${i === cur ? ' active' : ''}`}
            style={src ? { backgroundImage: `url(${src})` } : undefined}
            role="group"
            aria-hidden={i !== cur}
          />
        )
      })}

      <div className="hero-content" key={item.id}>
        <div className="hero-badges">
          {rating && <span className="rating">★ {rating}</span>}
          {year && <span>{year}</span>}
          {isMovie && <span>Movie</span>}
          <span className="hero-badge">Trending</span>
        </div>
        <h1>{title}</h1>
        {item.description && <p>{stripHtml(item.description)}</p>}
        <div className="hero-actions">
          <Link className="btn btn-play" to={watchTo} state={{ title, year }}>
            ▶ {isMovie ? 'Watch Movie' : 'Watch'}
          </Link>
          <Link className="btn btn-ghost" to={infoTo}>
            More Info
          </Link>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-btn prev"
            onClick={() => go(prev)}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-btn next"
            onClick={() => go(next)}
            aria-label="Next"
          >
            ›
          </button>
          <div className="hero-dots">
            {anime.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className={`dot${i === cur ? ' active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Go to ${animeTitle(m.title)}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// AniList synopses are HTML; shed the tags for the hero's plain-text blurb.
function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').trim()
}