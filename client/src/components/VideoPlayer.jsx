import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

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
  muted: 'M3 9v6h4l5 5V4L7 9H3zm10 2l2-2 2 2 2-2 2 2-2 2 2 2-2 2-2-2-2 2-2-2 2-2z',
  gear: 'M19.14 12.94a6.9 6.9 0 0 0 .05-.94 6.9 6.9 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.83a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.12.55-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.45 8.88a.5.5 0 0 0 .12.64l2.03 1.58a6.9 6.9 0 0 0 0 1.88L2.57 14.56a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.37.3.6.22l2.4-.96c.5.39 1.04.7 1.61.94l.36 2.54c.03.23.24.42.5.42h3.83c.26 0 .47-.19.5-.42l.36-2.54c.58-.24 1.12-.55 1.62-.94l2.39.96c.23.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z',
  fullscreen: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  'fullscreen-exit': 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
  pip: 'M3 3h18v18H3zM3 5h18v12h-8v4H3zM19 15V7H5v6h2V9h10v6h2z',
  replay: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
  cc: 'M3 5h18v14H3zM8.5 9.5c-1 0-1.5.6-1.5 1.4v1.2c0 .8.5 1.4 1.5 1.4 1 0 1.5-.6 1.5-1.4l-1.1-.4c0 .3-.1.4-.4.4s-.4-.2-.4-.4v-1.2c0-.3.2-.4.4-.4s.4.2.4.4l1.1-.4c0-.9-.5-1.4-1.5-1.4zm7 0c-1 0-1.5.6-1.5 1.4v1.2c0 .8.5 1.4 1.5 1.4 1 0 1.5-.6 1.5-1.4l-1.1-.4c0 .3-.1.4-.4.4s-.4-.2-.4-.4v-1.2c0-.3.2-.4.4-.4s.4.2.4.4l1.1-.4c0-.9-.5-1.4-1.5-1.4z',
}

function Icon({ name, size = 22 }) {
  return (
    <svg className="vicon" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

// A full custom player: transport, seek, volume, speed, HLS quality, captions,
// fullscreen, picture-in-picture, keyboard shortcuts, and auto-hiding controls.
export default function VideoPlayer({ src, type }) {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const seekRef = useRef(null)
  const hideTimer = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(true)
  const [ended, setEnded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [level, setLevel] = useState(-1) // -1 = auto
  const [levels, setLevels] = useState([])
  const [captions, setCaptions] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [dragPct, setDragPct] = useState(null)
  const [loadError, setLoadError] = useState(false)

  // ---------- HLS / source setup ----------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setLoadError(false)
    setBuffering(true)

    if (type === 'hls' && Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels.map((l, i) => ({
            index: i,
            label: l.height ? `${l.height}p` : `Level ${i}`,
          })),
        )
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setLevel(data.level))
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else hls.destroy()
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    // Native: direct MP4, or Safari's built-in HLS.
    video.src = src
    return () => {
      video.removeAttribute('src')
      video.load()
      hlsRef.current = null
    }
  }, [src, type])

  // Apply quality / volume / speed / captions to the element + Hls instance.
  useEffect(() => {
    if (hlsRef.current) hlsRef.current.currentLevel = level
  }, [level])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.textTracks.forEach((track) => {
      track.mode = captions && track.kind === 'captions' ? 'showing' : 'hidden'
    })
  }, [captions])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = muted
  }, [volume, muted])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  // ---------- Auto-hide controls ----------
  const pokeControls = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
    }, 3000)
  }, [])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  // ---------- Transport actions ----------
  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  const skip = (delta) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0)
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const changeVolume = (pct) => {
    const v = pct / 100
    setVolume(v)
    if (v > 0) setMuted(false)
    else setMuted(true)
  }

  const toggleFullscreen = async () => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await el.requestFullscreen?.()
  }

  const togglePip = async () => {
    const v = videoRef.current
    if (!v) return
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    else if (document.pictureInPictureEnabled) await v.requestPictureInPicture()
  }

  // ---------- Seek bar (click + drag) ----------
  const seekFromEvent = (e) => {
    const bar = seekRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    return Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
  }

  const applySeek = (pct) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration) || v.duration === 0) return
    v.currentTime = (pct / 100) * v.duration
  }

  const onSeekDown = (e) => {
    const pct = seekFromEvent(e)
    setDragPct(pct)
    applySeek(pct)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onSeekMove = (e) => {
    if (dragPct === null) return
    const pct = seekFromEvent(e)
    setDragPct(pct)
    applySeek(pct)
  }
  const onSeekUp = () => setDragPct(null)

  // ---------- Keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          skip(SKIP)
          break
        case 'ArrowLeft':
          skip(-SKIP)
          break
        case 'ArrowUp':
          e.preventDefault()
          changeVolume(Math.min(100, volume * 100 + 10))
          break
        case 'ArrowDown':
          e.preventDefault()
          changeVolume(Math.max(0, volume * 100 - 10))
          break
        case 'm':
        case 'M':
          toggleMute()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'c':
        case 'C':
          setCaptions((c) => !c)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted, dragPct])

  // ---------- Media events ----------
  const onTimeUpdate = () => {
    setCurrentTime(videoRef.current.currentTime)
    pokeControls()
  }
  const onLoadedMetadata = () => setDuration(videoRef.current.duration || 0)
  const onProgress = () => {
    const v = videoRef.current
    if (v && v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
  }
  const onPlay = () => {
    setPlaying(true)
    setEnded(false)
    pokeControls()
  }
  const onPause = () => {
    setPlaying(false)
    setShowControls(true)
  }
  const onWaiting = () => setBuffering(true)
  const onPlaying = () => {
    setBuffering(false)
    setShowControls(true)
    pokeControls()
  }
  const onEnded = () => setEnded(true)

  const onError = () => {
    setBuffering(false)
    setLoadError(true)
    setShowControls(true)
  }

  const retry = () => {
    const video = videoRef.current
    if (!video) return
    setLoadError(false)
    setBuffering(true)
    video.load()
    if (hlsRef.current) hlsRef.current.startLoad()
  }

  const seekPct = duration ? (currentTime / duration) * 100 : 0
  const bufferPct = duration ? (buffered / duration) * 100 : 0
  const shownPct = dragPct ?? seekPct
  const showBigPlay = !playing && !ended && !buffering && !loadError

  return (
    <div
      ref={wrapRef}
      className={`vplayer ${showControls ? '' : 'hiding-controls'}`}
      onMouseMove={pokeControls}
      onMouseLeave={() => {
        if (!videoRef.current?.paused) {
          clearTimeout(hideTimer.current)
          setShowControls(false)
        }
      }}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onProgress={onProgress}
        onPlay={onPlay}
        onPause={onPause}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onEnded={onEnded}
        onError={onError}
      />

      {buffering && !loadError && <div className="vplayer-spinner" />}

      {loadError && (
        <div className="vplayer-error">
          <h3>Couldn&rsquo;t load this video</h3>
          <p>
            The source (Archive.org) is temporarily unavailable or throttled. Try again or pick
            another title.
          </p>
          <button className="vbtn vplayer-error-btn" onClick={retry}>
            ↻ Retry
          </button>
        </div>
      )}

      {showBigPlay && (
        <button className="vplayer-bigplay" onClick={togglePlay} aria-label="Play">
          <Icon name="play" size={40} />
        </button>
      )}

      {ended && (
        <button className="vplayer-bigplay" onClick={togglePlay} aria-label="Replay">
          <Icon name="replay" size={40} />
        </button>
      )}

      {/* Control bar */}
      <div className="vplayer-bar">
        <div
          ref={seekRef}
          className="vplayer-seek"
          onPointerDown={onSeekDown}
          onPointerMove={onSeekMove}
          onPointerUp={onSeekUp}
          onPointerCancel={onSeekUp}
        >
          <div className="vplayer-seek-buffer" style={{ width: `${bufferPct}%` }} />
          <div className="vplayer-seek-fill" style={{ width: `${shownPct}%` }} />
          <div className="vplayer-seek-thumb" style={{ left: `${shownPct}%` }} />
        </div>

        <div className="vplayer-bar-row">
          <button className="vbtn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button className="vbtn" onClick={() => skip(-SKIP)} aria-label="Back 10 seconds">
            <Icon name="back-10" />
          </button>
          <button className="vbtn" onClick={() => skip(SKIP)} aria-label="Forward 10 seconds">
            <Icon name="forward-10" />
          </button>

          <button className="vbtn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            <Icon name={muted || volume === 0 ? 'muted' : 'volume'} />
          </button>
          <input
            className="vslider vvolume"
            type="range"
            min="0"
            max="100"
            value={muted ? 0 : Math.round(volume * 100)}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume"
          />

          <span className="vplayer-time">
            {fmtTime(currentTime)} <span className="vplayer-sep">/</span> {fmtTime(duration)}
          </span>

          <span className="vplayer-spacer" />

          {/* Settings gear */}
          <div className="vsettings">
            <button
              className="vbtn"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-label="Settings"
            >
              <Icon name="gear" />
            </button>
            {settingsOpen && (
              <div className="vsettings-menu">
                <div className="vsettings-title">Speed</div>
                <div className="vsettings-options">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      className={`vopt ${speed === s ? 'active' : ''}`}
                      onClick={() => {
                        setSpeed(s)
                        setSettingsOpen(false)
                      }}
                    >
                      {s}×
                    </button>
                  ))}
                </div>

                {levels.length > 0 && (
                  <>
                    <div className="vsettings-title">Quality</div>
                    <div className="vsettings-options">
                      <button
                        className={`vopt ${level === -1 ? 'active' : ''}`}
                        onClick={() => {
                          setLevel(-1)
                          setSettingsOpen(false)
                        }}
                      >
                        Auto
                      </button>
                      {levels.map((l) => (
                        <button
                          key={l.index}
                          className={`vopt ${level === l.index ? 'active' : ''}`}
                          onClick={() => {
                            setLevel(l.index)
                            setSettingsOpen(false)
                          }}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="vsettings-title">Captions</div>
                <button
                  className={`vopt toggle ${captions ? 'active' : ''}`}
                  onClick={() => setCaptions((c) => !c)}
                >
                  <Icon name="cc" size={16} /> {captions ? 'On' : 'Off'}
                </button>
              </div>
            )}
          </div>

          <button className="vbtn" onClick={togglePip} aria-label="Picture in picture">
            <Icon name="pip" />
          </button>

          <button className="vbtn" onClick={toggleFullscreen} aria-label="Fullscreen">
            <Icon name="fullscreen" />
          </button>
        </div>
      </div>
    </div>
  )
}