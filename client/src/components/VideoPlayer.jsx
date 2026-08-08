import { useState } from 'react'

// Embed player with a server bar below it.
//
// `servers` is the list of embed providers ({id, name, embedUrl}) returned by
// the backend (WFS + VidLink). The player plays whichever server is active:
//   - "Auto" (default) starts on the first server and, if that embed fails to
//     load, falls through to the next automatically.
//   - Clicking a named server pins it (manual mode).
//
// If no servers are passed it falls back to a single embed URL built from
// mediaType/tmdbId/season/episode, so callers that don't fetch servers still
// work. Note: cross-origin iframes only fire error events for hard load
// failures, so auto-fallback is best-effort.

export default function VideoPlayer({
  servers,
  mediaType = 'movie',
  tmdbId,
  season,
  episode,
}) {
  const [autoMode, setAutoMode] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [pinned, setPinned] = useState(null)
  const [lastError, setLastError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // single-serving fallback for pages that don't hand us a servers list
  let fallback = ''
  if (mediaType === 'tv' && tmdbId && season && episode) {
    fallback = `https://embed.wfs.lol/embed/tv/${tmdbId}/${season}/${episode}`
  } else if (mediaType === 'movie' && tmdbId) {
    fallback = `https://embed.wfs.lol/embed/movie/${tmdbId}`
  }

  const list =
    servers && servers.length ? servers : fallback ? [{ id: 'wfs', name: 'WFS', embedUrl: fallback }] : []

  const active = autoMode
    ? list[Math.min(attempt, list.length - 1)]
    : list.find((s) => s.id === pinned) || null

  const embedUrl = active ? active.embedUrl : ''

  const retry = () => {
    setLastError(false)
    setRetryKey((k) => k + 1)
  }

  const pickManual = (id) => {
    setLastError(false)
    setPinned(id)
    setAutoMode(false)
  }

  const pickAuto = () => {
    setLastError(false)
    setAttempt(0)
    setPinned(null)
    setAutoMode(true)
  }

  const onIframeError = () => {
    setLastError(true)
    if (autoMode && attempt < list.length - 1) {
      // fall through to the next server automatically
      setAttempt((a) => a + 1)
      setRetryKey((k) => k + 1)
    }
  }

  if (!list.length) {
    return (
      <div className="vplayer">
        <div className="vplayer-error">
          <h3>Couldn't load this video</h3>
          <p>No valid video source was provided.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        className="vplayer"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!lastError ? (
          <iframe
            key={`${active.id}-${retryKey}`}
            src={embedUrl}
            title="Video Player"
            width="100%"
            height="100%"
            style={{
              display: 'block',
              width: '100%',
              border: 0,
            }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
            onError={onIframeError}
          />
        ) : (
          <div className="vplayer-error">
            <h3>Couldn't load this video</h3>
            <p>
              The current server failed to respond.
              {autoMode && attempt < list.length - 1 && ' Trying the next one…'}
            </p>
            <button className="vbtn vplayer-error-btn" onClick={retry}>
              ↻ Retry
            </button>
          </div>
        )}
      </div>

      <div className="servers">
        <div className="servers-head">
          <span className="servers-label">Servers · {list.length}</span>
          <span className="servers-status">
            {autoMode
              ? `Auto — trying ${active.name} (${attempt + 1}/${list.length})`
              : `${active.name}`}
          </span>
        </div>
        <div className="server-chips">
          <button
            type="button"
            className={`server-chip${autoMode ? ' active' : ''}`}
            onClick={pickAuto}
          >
            Auto
          </button>
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`server-chip${!autoMode && pinned === s.id ? ' active' : ''}`}
              onClick={() => pickManual(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}