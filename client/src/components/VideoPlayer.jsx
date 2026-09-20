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
// Info overlay (title/poster/description over the embed): Manual-only — opens
// via the "ⓘ Info" button, no auto-detection.
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
  onServerChange: onServerChangeProp,
  selectedServer,
}) {
  const [pinned, setPinned] = useState(selectedServer || null)
  const [lastError, setLastError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  // Per-server AniList/TMDB toggle: keyed by server id, value is true = use AniList
  const [serverUseAnilist, setServerUseAnilist] = useState({})

  // Info overlay (title/poster/description). Manual-only — opens/closes via
  // the "ⓘ Info" button in the controls row.
  const [overlayOpen, setOverlayOpen] = useState(false)

  const toggleOverlay = () => {
    setOverlayOpen((o) => !o)
  }

  const dismissOverlay = () => {
    setOverlayOpen(false)
  }

  const toggleServerMode = (serverId) => {
    setServerUseAnilist((prev) => ({ ...prev, [serverId]: !prev[serverId] }))
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
    if (onServerChangeProp) onServerChangeProp(id)
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

  const active = list.find((s) => s.id === pinned) || list[0] || null

  // Build embed URL: use anilistEmbedUrl when the per-server toggle is set to AniList
  const getEmbedUrl = (server) => {
    if (!server) return ''
    if (server.supportsAnilist && server.anilistEmbedUrl && serverUseAnilist[server.id]) {
      return server.anilistEmbedUrl
    }
    return server.embedUrl || ''
  }

  const embedUrl = getEmbedUrl(active)

  const onIframeError = () => {
    setLastError(true)
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

  // Server dropdown: numbered labels, first server is default
  const serverOptions = list.map((s, i) => ({ value: s.id, label: `Server ${i + 1}` }))
  const serverValue = pinned || list[0]?.id
  const onServerChange = (v) => pickManual(v)

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
            button. */}
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

          {list
            .filter((s) => s.supportsAnilist && s.anilistEmbedUrl)
            .map((s) => {
              const usingAnilist = Boolean(serverUseAnilist[s.id])
              return (
                <div key={s.id} className="server-id-toggle">
                  <span className="server-id-toggle-label">{s.name}</span>
                  <button
                    type="button"
                    className={!usingAnilist ? 'active' : ''}
                    onClick={() => !usingAnilist && toggleServerMode(s.id)}
                    title={`Use TMDB id for ${s.name}`}
                  >
                    TMDB
                  </button>
                  <button
                    type="button"
                    className={usingAnilist ? 'active' : ''}
                    onClick={() => usingAnilist && toggleServerMode(s.id)}
                    title={`Use AniList id for ${s.name}`}
                  >
                    AniList
                  </button>
                </div>
              )
            })}
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
