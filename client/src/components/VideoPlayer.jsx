import { useState } from 'react'

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SKIP = 10

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return h ? `${h}:${mm}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  'back-10': 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
  'forward-10': 'M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z',
  volume: 'M3 9v6h4l5 5V4L7 9H3z',
  muted: 'M3 9v6h4l5 5V4L7 9H3zm10 2l2-2 2 2 2-2 2 2 2-2 2 2-2 2 2 2-2 2-2-2-2 2-2-2 2-2z',
  gear: 'M19.14 12.94a6.9 6.9 0 0 0 .05-.94 6.9 6.9 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.83a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.12.55-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.45 8.88a.5.5 0 0 0 .12.64l2.03 1.58a6.9 6.9 0 0 0 0 1.88L2.57 14.56a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.37.3.6.22l2.4-.96c.5.39 1.04.7 1.61.94l.36 2.54c.03.23.24.42.5.42h3.83c.26 0 .47-.19.5-.42l.36-2.54c.58.24 1.12.55 1.62.94l2.39-.96c.23.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z',
  fullscreen: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  'fullscreen-exit': 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
  pip: 'M3 3h18v18H3zM3 5h18v12h-8v4H3zM19 15V7H5v6h2V9h10v6h2z',
  replay: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
  cc: 'M3 5h18v14H3zM8.5 9.5c-1 0-1.5.6-1.5 1.4v1.2c0 .8.5 1.4 1.5 1.4 1 0 1.5-.6 1.5-1.4l-1.1-.4c0 .3-.1.4-.4.4s-.4-.2-.4-.4v-1.2c0-.3.2-.4.4-.4s.4.2.4.4l1.1-.4c0-.9-.5-1.4-1.5-1.4zm7 0c-1 0-1.5.6-1.5 1.4v1.2c0 .8.5 1.4 1.5 1.4 1 0 1.5-.6 1.5-1.4l-1.1-.4c0 .3-.1.4-.4.4s-.4-.2-.4-.4v-1.2c0-.3.2-.4.4-.4s.4.2.4.4l1.1-.4c0-.9-.5-1.4-1.5-1.4z',
}

function Icon({ name, size = 22 }) {
  return (
    <svg
      className="vicon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

// WFS embed player.
// Movies use:
// https://embed.wfs.lol/embed/movie/{tmdbId}
//
// TV / anime use:
// https://embed.wfs.lol/embed/tv/{tmdbId}/{season}/{episode}
//
// Manga uses:
// https://embed.wfs.lol/embed/manga/{mangaId}/{chapterId}

export default function VideoPlayer({
  tmdbId,
  mediaType = 'movie',
  season,
  episode,
  mangaId,
  chapterId,
}) {
  const [loadError, setLoadError] = useState(false)

  let embedUrl = ''

  if (mediaType === 'movie' && tmdbId) {
    embedUrl = `https://embed.wfs.lol/embed/movie/${tmdbId}`
  } else if (
    (mediaType === 'tv' || mediaType === 'anime') &&
    tmdbId &&
    season &&
    episode
  ) {
    embedUrl = `https://embed.wfs.lol/embed/tv/${tmdbId}/${season}/${episode}`
  } else if (mediaType === 'manga' && mangaId && chapterId) {
    embedUrl = `https://embed.wfs.lol/embed/manga/${mangaId}/${chapterId}`
  }

  if (!embedUrl) {
    return (
      <div className="vplayer">
        <div className="vplayer-error">
          <h3>Couldn't load this video</h3>
          <p>
            No valid video source was provided.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="vplayer"
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!loadError ? (
        <iframe
          src={embedUrl}
          title="Video Player"
          width="100%"
          height="100%"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            border: 0,
          }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          onError={() => setLoadError(true)}
        />
      ) : (
        <div className="vplayer-error">
          <h3>Couldn't load this video</h3>
          <p>
            The video player could not be loaded. Please try again.
          </p>
          <button
            className="vbtn vplayer-error-btn"
            onClick={() => setLoadError(false)}
          >
            ↻ Retry
          </button>
        </div>
      )}
    </div>
  )
}