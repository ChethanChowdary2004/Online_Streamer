import { useState } from 'react'
import {
  getTvDetail,
  getTvSeason,
  getStream,
} from '../api'
import useFetch from '../hooks/useFetch'
import useWatchHistory from '../hooks/useWatchHistory'
import useContinueWatching from '../hooks/useContinueWatching'
import VideoPlayer from '../components/VideoPlayer'
import MovieRow from '../components/MovieRow'
import AnimeRow from '../components/AnimeRow'

export default function SeriesPlayerPage({ tmdbId, anilistId, animeRelations, videasyOnly = false, resumeState = {} }) {
  const [seasonNum, setSeasonNum] = useState(resumeState.resumeSeasonNumber || null)
  const [episodeNum, setEpisodeNum] = useState(resumeState.resumeEpisodeNumber || null)
  const [selectedServer, setSelectedServer] = useState(resumeState.resumeServerName || null)

  const { data: tv, error, loading } = useFetch(() => getTvDetail(tmdbId), [
    tmdbId,
  ])
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
  let servers = stream.data?.servers || []

  const realTitle = tv?.name
  const displayTitle = realTitle || 'This series'
  const posterPath = tv?.poster_path

  useWatchHistory('series', tmdbId, realTitle, posterPath || '', activeSeason, activeEpisode)

  useContinueWatching(
    'series',
    tmdbId,
    realTitle,
    posterPath || '',
    activeSeason,
    activeEpisode,
    selectedServer,
    episodes.find((e) => e.episode_number === activeEpisode)?.runtime
      ? episodes.find((e) => e.episode_number === activeEpisode).runtime * 60
      : null
  )

  if (videasyOnly) {
    servers = servers.filter((s) => s.id === 'videasy')
  }

  const handleServerChange = (serverId) => {
    if (serverId === 'auto') {
      setSelectedServer(null)
    } else {
      setSelectedServer(serverId)
    }
  }

  if (loading) return <div className="player-loading">Loading series…</div>

  if (error || !tv) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This series couldn't be loaded.</p>
      </div>
    )
  }

  const overview = tv.overview || ''

  const seasonOptions = seasons.map((s) => ({
    value: String(s.season_number),
    label: s.name || `Season ${s.season_number}`,
  }))
  const episodeOptions = episodes.map((ep) => ({
    value: String(ep.episode_number),
    label: `${ep.episode_number}. ${ep.name || `Episode ${ep.episode_number}`}`,
  }))

  const lastEpisode = episodes[episodes.length - 1]?.episode_number ?? activeEpisode
  const nextSeason = seasons.find((s) => s.season_number === activeSeason + 1)
  const canPrev = activeEpisode > 1
  const canNext = activeEpisode < lastEpisode || Boolean(nextSeason)

  const goPrev = () => {
    if (canPrev) setEpisodeNum(activeEpisode - 1)
  }

  const goNext = () => {
    if (activeEpisode < lastEpisode) {
      setEpisodeNum(activeEpisode + 1)
    } else if (nextSeason) {
      setSeasonNum(nextSeason.season_number)
      setEpisodeNum(null)
    }
  }

  const changeSeason = (val) => {
    setSeasonNum(val)
    setEpisodeNum(null)
  }

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
            anilistId={anilistId}
            title={displayTitle}
            description={overview}
            seasonOptions={seasonOptions}
            episodeOptions={episodeOptions}
            onSeasonChange={changeSeason}
            onEpisodeChange={setEpisodeNum}
            onPrev={goPrev}
            onNext={goNext}
            canPrev={canPrev}
            canNext={canNext}
            selectedServer={selectedServer}
            onServerChange={handleServerChange}
          />
        ))}

      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : (
        <MovieRow
          title="Similar Series"
          items={(tv.similar && tv.similar.results) || []}
          type="tv"
        />
      )}
    </div>
  )
}
