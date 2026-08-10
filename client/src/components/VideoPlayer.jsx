import { useState, useEffect, useRef, useCallback } from 'react'
import { animeEmbed } from '../api'
import FilterSelect from './FilterSelect'

// Full player block: the embed surface + a single controls row below it.
//
// `servers` is the list of embed providers ({id, name, embedUrl}) returned by
// the backend (WFS + VidLink). The player plays whichever server is active:
//   - "Auto" (default) starts on the first server and, if that embed fails to
//     load, falls through to the next automatically.
//   - Picking a named server from the dropdown pins it (manual mode).
//
// If no servers are passed it falls back to a single embed URL built from
// mediaType/tmdbId/season/episode, so callers that don't fetch servers still
// work. Note: cross-origin iframes only fire error events for hard load
// failures, so auto-fallback is best-effort.
//
// Controls row (below the player): Season / Episode / Server dropdowns on the
// left via FilterSelect, and Prev/Next episode buttons on the right. The
// season/episode dropdowns and prev/next handlers are optional — only series
// and anime pass them, so movies get just the server dropdown.
//
// Info overlay (title/poster/description over the embed): the embeds are
// sealed cross-origin iframes, so a pause can't be reliably detected from
// outside. The overlay opens from the "ⓘ Info" button in the controls row,
// and smart-auto hint sources (window blur / media keys / embed postMessage)
// open it ~2s after a pause-like signal and close it on resume.
//
// Anime-only: when `anilistId` is provided, VIDEASY can play a title from
// either its TMDB id (the stream server URL) or its AniList id. A small
// TMDB/AniList toggle appears next to the server dropdown.

export default function VideoPlayer({
  servers,
  mediaType = 'movie',
  tmdbId,
  season,
  episode,
  anilistId,
  // Overlay content
  title,
  description,
  // Controls row (series/anime only)
  seasonOptions,
  episodeOptions,
  onSeasonChange,
  onEpisodeChange,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
}) {
  const [autoMode, setAutoMode] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [pinned, setPinned] = useState(null)
  const [lastError, setLastError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [videasyAnilist, setVideasyAnilist] = useState(false)

  // Info overlay (title/poster/description). The embeds are sealed cross-origin
  // iframes, so there's no reliable way to detect a pause from outside — the
  // overlay therefore opens from three sources:
  //   1. Manual "ⓘ Info" button in the controls row — always works, on every
  //      server.
  //   2. Smart auto — a message hinting "paused" opens it after ~2s, and a
  //      "resumed"/focus signal closes it. Hint sources: the parent window
  //      losing focus (the user clicked into the player), the media-session
  //      'pause' action (hardware media keys), or an embed reporting state via
  //      postMessage (best-effort free win).
  const [overlayOpen, setOverlayOpen] = useState(false)
  const autoTimer = useRef(null)
  // After the user dismisses the overlay (they're resuming), clicking back into
  // the player blurs this window again — suppress that blur for a beat so the
  // overlay doesn't instantly re-pop over a now-playing video.
  const suppressBlurUntil = useRef(0)

  const openOverlay = useCallback(() => setOverlayOpen(true), [])

  const closeOverlay = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setOverlayOpen(false)
  }, [])

  // Treat a pause-like signal as "open after a beat" and a resume-like signal
  // as "close now" (also cancels a pending open).
  const scheduleAuto = useCallback(
    (paused) => {
      if (autoTimer.current) clearTimeout(autoTimer.current)
      if (paused) autoTimer.current = setTimeout(openOverlay, 2000)
      else closeOverlay()
    },
    [openOverlay, closeOverlay],
  )

  const toggleOverlay = () => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    setOverlayOpen((o) => !o)
  }

  // Click-to-dismiss: the embed is sealed so we can't detect the actual
  // "resume" click inside it — the next click on the player closes the overlay
  // instead (and that's almost always the resume click).
  const dismissOverlay = () => {
    suppressBlurUntil.current = Date.now() + 2500
    closeOverlay()
  }

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

  // Anime-only: VIDEASY can play from either the TMDB id (the stream server's
  // URL) or the AniList id. `isVideasyActive` gates the toggle, and the
  // override swaps the embed URL when the user has flipped to AniList.
  const isVideasyActive = Boolean(active && active.id === 'videasy')
  const anilistUrl = anilistId ? animeEmbed(anilistId, episode) : ''
  const embedUrl =
    isVideasyActive && videasyAnilist && anilistUrl
      ? anilistUrl
      : active
        ? active.embedUrl
        : ''

  // Free win: embeds that report player state via postMessage drive the
  // overlay. Common message shapes are accepted; unknown messages are ignored,
  // so unrelated page messages never flip it.
  useEffect(() => {
    const onMessage = (e) => {
      const d = e?.data
      if (!d || typeof d !== 'object') return
      let paused = null
      const type = typeof d.type === 'string' ? d.type.toLowerCase() : ''
      if (type === 'pause' || type === 'paused') paused = true
      else if (type === 'play' || type === 'playing') paused = false
      else if (d.event === 'pause') paused = true
      else if (d.event === 'play') paused = false
      else if (d.playing === false || d.paused === true) paused = true
      else if (d.playing === true || d.paused === false) paused = false
      else if (d.state === 'paused' || d.state === 'pause' || d.status === 'paused') paused = true
      else if (d.state === 'playing' || d.state === 'play' || d.status === 'playing') paused = false
      if (paused !== null) scheduleAuto(paused)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [scheduleAuto])

  // Smart-ish heuristic: clicking inside a cross-origin iframe moves focus out
  // of our window (blur) — which is exactly when someone pauses. Open the
  // overlay ~2s later; coming back (focus) closes it. A blur arriving right
  // after a click-to-dismiss (i.e. the resume click, which also blurs us) is
  // suppressed so the overlay doesn't re-pop over a now-playing video.
  useEffect(() => {
    const onBlur = () => {
      if (Date.now() < suppressBlurUntil.current) return
      scheduleAuto(true)
    }
    const onFocus = () => {
      suppressBlurUntil.current = Date.now() + 2500
      scheduleAuto(false)
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [scheduleAuto])

  // Bonus: hardware media keys ("pause"/"play") map onto the overlay.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    try {
      ms.setActionHandler('pause', () => scheduleAuto(true))
      ms.setActionHandler('play', () => scheduleAuto(false))
    } catch { /* older browsers */ }
    return () => {
      try {
        ms.setActionHandler('pause', null)
        ms.setActionHandler('play', null)
      } catch { /* noop */ }
    }
  }, [scheduleAuto])

  const setVideasyMode = (mode) => {
    setVideasyAnilist(mode === 'anilist')
    setLastError(false)
    setRetryKey((k) => k + 1)
  }

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

  // Server dropdown options: "Auto" plus each named server.
  const serverOptions = [
    { value: 'auto', label: `Auto — ${active?.name || 'next'}` },
    ...list.map((s) => ({ value: s.id, label: s.name })),
  ]
  const serverValue = autoMode ? 'auto' : pinned
  const onServerChange = (v) => (v === 'auto' ? pickAuto() : pickManual(v))

  // AniList descriptions are HTML — strip tags so the overlay reads cleanly.
  const cleanDesc = (description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const showSeason = Boolean(seasonOptions && seasonOptions.length && onSeasonChange)
  const showEpisode = Boolean(episodeOptions && episodeOptions.length && onEpisodeChange)
  const showPrevNext = Boolean(onPrev || onNext)

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

        {/* Info overlay — hero-banner style: the poster becomes a dimmed full-bleed
            backdrop, and the "Now Playing" label + title + description sit on
            the right side of the player. Opened manually via the ⓘ Info
            button, or automatically after a pause-like signal. */}
        {title && overlayOpen && (
          <div
            className="vp-overlay"
            onClick={dismissOverlay}
            role="button"
            aria-label="Dismiss title & description"
          >
            <div className="vp-overlay-content">
              <span className="vp-overlay-eyebrow">Now Playing</span>
              <h3 className="vp-overlay-title">{title}</h3>
              {cleanDesc && <p className="vp-overlay-desc">{cleanDesc}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="player-controls">
        <div className="player-controls-left">
          <button
            type="button"
            className={`pnav-btn info-overlay-btn${overlayOpen ? ' active' : ''}`}
            onClick={toggleOverlay}
            aria-pressed={overlayOpen}
            aria-label="Show title and description"
            title="Show / hide title & description"
          >
            ⓘ Info
          </button>

          {showSeason && (
            <FilterSelect
              label="Season"
              value={season != null ? String(season) : ''}
              onChange={(v) => onSeasonChange(v ? Number(v) : null)}
              options={seasonOptions}
            />
          )}

          {showEpisode && (
            <FilterSelect
              label="Episode"
              value={episode != null ? String(episode) : ''}
              onChange={(v) => onEpisodeChange(v ? Number(v) : null)}
              options={episodeOptions}
            />
          )}

          <FilterSelect
            label="Server"
            value={serverValue}
            onChange={onServerChange}
            options={serverOptions}
          />

          {anilistId && isVideasyActive && (
            <div className="videasy-toggle">
              <span className="videasy-toggle-label">Source</span>
              <button
                type="button"
                className={!videasyAnilist ? 'active' : ''}
                onClick={() => setVideasyMode('tmdb')}
              >
                TMDB
              </button>
              <button
                type="button"
                className={videasyAnilist ? 'active' : ''}
                onClick={() => setVideasyMode('anilist')}
              >
                AniList
              </button>
            </div>
          )}
        </div>

        {showPrevNext && (
          <div className="player-controls-right">
            <button
              type="button"
              className="pnav-btn"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Previous episode"
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className="pnav-btn"
              onClick={onNext}
              disabled={!canNext}
              aria-label="Next episode"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}