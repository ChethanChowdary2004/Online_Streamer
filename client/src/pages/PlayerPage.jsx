import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getMovieDetail, getTvDetail, getTvSeason, getStream } from '../api'
import useFetch from '../hooks/useFetch'
import FilterSelect from '../components/FilterSelect'
import VideoPlayer from '../components/VideoPlayer'

// Plays movies and TV shows (series + anime) via embed servers.
//   /watch/movie/:id     -> MoviePlayer
//   /watch/tv/:id        -> TvPlayer (anime uses the same TV embed route)
//
// Both players ask the backend for the list of embed servers (WFS + VidLink)
// and hand them to VideoPlayer, which renders the active server and lets the
// user switch (or auto-fall through on failure). TvPlayer resolves the servers
// for the currently selected season + episode.

export default function PlayerPage() {
  const { type, id } = useParams()
  const isTv = type === 'tv' || type === 'anime'

  if (type !== 'movie' && !isTv) {
    return (
      <div className="vplayer-error">
        <h3>Unsupported media</h3>
        <p>This media type can't be watched here.</p>
      </div>
    )
  }

  return type === 'movie' ? (
    <MoviePlayer tmdbId={id} />
  ) : (
    <TvPlayer tmdbId={id} />
  )
}

// ---- Movies ----
function MoviePlayer({ tmdbId }) {
  const { data, error, loading } = useFetch(
    () =>
      getMovieDetail(tmdbId).then((d) => {
        const title = d.title || 'This title'
        const year = (d.release_date || '').slice(0, 4)
        return getStream({ tmdbId, title, year, mediaType: 'movie' }).then(
          (res) => ({
            title,
            year,
            servers: res.servers || [],
          }),
        )
      }),
    [tmdbId],
  )

  if (loading) return <div className="player-loading">Loading stream…</div>

  if (error || !data?.servers?.length) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>
          “{data?.title || 'This title'}” couldn’t be loaded. Try another title.
        </p>
      </div>
    )
  }

  return (
    <div className="player-page">
      <VideoPlayer tmdbId={tmdbId} mediaType="movie" servers={data.servers} />
      <h2 className="player-title">{data.title}</h2>
      <p className="player-sub">{data.year}</p>
    </div>
  )
}

// ---- TV shows / anime ----
function TvPlayer({ tmdbId }) {
  const { data: tv, error, loading } = useFetch(() => getTvDetail(tmdbId), [
    tmdbId,
  ])
  const [seasonNum, setSeasonNum] = useState(null)
  const [episodeNum, setEpisodeNum] = useState(null)

  // Pickable seasons: skip specials (season 0) and empty ones.
  const seasons = (tv?.seasons || []).filter(
    (s) => s.season_number > 0 && s.episode_count > 0,
  )
  const activeSeason = seasonNum ?? seasons[0]?.season_number ?? null

  const seasonFetch = useFetch(
    () =>
      activeSeason ? getTvSeason(tmdbId, activeSeason) : Promise.resolve(null),
    [tmdbId, activeSeason],
  )
  const episodes = seasonFetch.data?.episodes || []
  const activeEpisode = episodeNum ?? episodes[0]?.episode_number ?? null

  // Resolve the embed servers for the currently selected season + episode.
  const stream = useFetch(
    () =>
      activeSeason && activeEpisode
        ? getStream({
            tmdbId,
            mediaType: 'tv',
            season: activeSeason,
            episode: activeEpisode,
          })
        : Promise.resolve(null),
    [tmdbId, activeSeason, activeEpisode],
  )
  const servers = stream.data?.servers || []

  if (loading) return <div className="player-loading">Loading series…</div>

  if (error || !tv) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This series couldn’t be loaded.</p>
      </div>
    )
  }

  const title = tv.name || 'This series'
  const year = (tv.first_air_date || '').slice(0, 4)
  const activeSeasonInfo = seasons.find((s) => s.season_number === activeSeason)

  return (
    <div className="player-page">
      {activeSeason && activeEpisode &&
        (stream.loading && !servers.length ? (
          <div className="player-loading">Loading player…</div>
        ) : (
          <VideoPlayer
            tmdbId={tmdbId}
            mediaType="tv"
            season={activeSeason}
            episode={activeEpisode}
            servers={servers}
          />
        ))}

      <h2 className="player-title">{title}</h2>

      <div className="player-selectors">
        <FilterSelect
          label="Season"
          value={activeSeason ? String(activeSeason) : ''}
          onChange={(val) => {
            setSeasonNum(val ? Number(val) : null)
            setEpisodeNum(null)
          }}
          options={seasons.map((s) => ({
            value: String(s.season_number),
            label: s.name || `Season ${s.season_number}`,
          }))}
        />

        <FilterSelect
          label="Episode"
          value={activeEpisode ? String(activeEpisode) : ''}
          onChange={(val) => setEpisodeNum(val ? Number(val) : null)}
          options={episodes.map((ep) => ({
            value: String(ep.episode_number),
            label: `${ep.episode_number}. ${ep.name || `Episode ${ep.episode_number}`}`,
          }))}
        />
      </div>

      <p className="player-sub">
        {title}
        {year ? ` · ${year}` : ''}
        {activeSeasonInfo ? ` · ${activeSeasonInfo.name}` : ''}
        {activeEpisode ? ` · EP ${activeEpisode}` : ''}
      </p>
    </div>
  )
}