import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageUrl } from '../api'

const SLIDE_MS = 7000
const MAX_SLIDES = 5

// Full-width featured slideshow at the top of the home page. Cycles through
// the top few trending titles, auto-advancing every SLIDE_MS. The backdrop
// crossfades between slides; arrows + dots give manual control.
export default function HeroBanner({ items }) {
  const movies = (items || []).filter((m) => !m.adult).slice(0, MAX_SLIDES)
  const count = movies.length
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
  const item = movies[cur]
  const go = (i) => setIndex(((i % count) + count) % count)

  const title = item.title || item.name || 'Untitled'
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR'
  const year = (item.release_date || item.first_air_date || '').slice(0, 4)
  const isTv = item.media_type === 'tv'
  const to = isTv ? `/tv/${item.id}` : `/movie/${item.id}`
  const watchTo = isTv ? `/watch/tv/${item.id}` : `/watch/movie/${item.id}`

  return (
    <section
      className="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="Trending movies"
    >
      {movies.map((m, i) => {
        // Only load the current + upcoming backdrops to keep the hero light.
        const on = i === cur || i === next
        const src = on
          ? imageUrl(m.backdrop_path, 'original') || imageUrl(m.poster_path, 'w500')
          : undefined
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
          <span className="rating">★ {rating}</span>
          {year && <span>{year}</span>}
          {isTv && <span>Series</span>}
          <span className="hero-badge">Trending</span>
        </div>
        <h1>{title}</h1>
        {item.overview && <p>{item.overview}</p>}
        <div className="hero-actions">
          <Link className="btn btn-play" to={watchTo} state={{ title, year }}>
            ▶ Play
          </Link>
          <Link className="btn btn-ghost" to={to}>
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
            {movies.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className={`dot${i === cur ? ' active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Go to ${m.title || m.name || `slide ${i + 1}`}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
