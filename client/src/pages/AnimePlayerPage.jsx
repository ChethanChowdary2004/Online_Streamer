import { useState } from 'react'
import {
  getAnimeDetail,
  searchTv,
  searchMovies,
  getStream,
  getTvDetail,
  getTvSeason,
} from '../api'
import useFetch from '../hooks/useFetch'
import VideoPlayer from '../components/VideoPlayer'
import AnimeRow from '../components/AnimeRow'
import { animeTitle } from '../components/AnimeCard'

export default function AnimePlayerPage({ anilistId }) {
  const crossover = useFetch(
    () =>
      getAnimeDetail(anilistId).then(async (d) => {
        const media = d?.Media
        if (!media) return { title: null, tmdbId: null, mediaType: null, relations: [] }
        const title = animeTitle(media.title)
        const relations = (media.relations?.nodes || []).filter(
          (n) => n.type === 'ANIME',
        )
        const asMovie = media.format === 'MOVIE'
        let res = asMovie ? await searchMovies(title) : await searchTv(title)
        let mediaType = asMovie ? 'movie' : 'tv'
        let tmdbId = pickTmdbShow(res?.results, title, mediaType)
        if (!tmdbId) {
          res = asMovie ? await searchTv(title) : await searchMovies(title)
          mediaType = asMovie ? 'tv' : 'movie'
          tmdbId = pickTmdbShow(res?.results, title, mediaType)
        }
        return { title, tmdbId, mediaType, relations }
      }),
    [anilistId],
  )

  if (crossover.loading) return <div className="player-loading">Loading anime…</div>

  if (crossover.error || !crossover.data) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This anime couldn't be loaded.</p>
      </div>
    )
  }

  const { title, tmdbId, mediaType, relations } = crossover.data

  if (mediaType === 'movie') {
    return (
      <MovieAnimePlayer
        tmdbId={tmdbId}
        anilistId={anilistId}
        animeRelations={relations}
        hasTmdbMatch={Boolean(tmdbId)}
      />
    )
  }

  return (
    <SeriesAnimePlayer
      tmdbId={tmdbId}
      anilistId={anilistId}
      animeRelations={relations}
      hasTmdbMatch={Boolean(tmdbId)}
    />
  )
}

function MovieAnimePlayer({ tmdbId, anilistId, animeRelations, hasTmdbMatch }) {
  const { data, error, loading } = useFetch(async () => {
    if (!tmdbId) return { title: null, servers: [], overview: '' }

    const d = await getAnimeDetail(anilistId)
    const media = d?.Media
    const title = media ? animeTitle(media.title) : 'This anime'
    const year = (media?.startDate?.year || '').toString()

    const res = await getStream({
      tmdbId,
      title,
      year,
      mediaType: 'movie',
    })

    return {
      title,
      servers: res.servers || [],
      overview: media?.description || '',
    }
  }, [tmdbId, anilistId])

  if (loading) return <div className="player-loading">Loading stream…</div>

  if (error || !data?.servers?.length) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>
          "{data?.title || 'This anime'}" doesn't have a TMDB entry. Try searching for it on the anime page.
        </p>
      </div>
    )
  }

  let servers = data.servers

  if (!hasTmdbMatch) {
    servers = buildRestrictedAnimeServers(servers)
  } else {
    servers = buildFullAnimeServers(servers)
  }

  const selectableServers = servers.filter(s => !s.disabled)

  return (
    <div className="player-page">
      <VideoPlayer
        tmdbId={tmdbId}
        anilistId={anilistId}
        mediaType="movie"
        servers={selectableServers}
        title={data.title}
        description={data.overview}
        isAnime={true}
        hasTmdbMatch={hasTmdbMatch}
      />
      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : null}
    </div>
  )
}

function SeriesAnimePlayer({ tmdbId, anilistId, animeRelations, hasTmdbMatch }) {
  const [seasonNum, setSeasonNum] = useState(null)
  const [episodeNum, setEpisodeNum] = useState(null)

  const tvDetail = useFetch(
    () => {
      if (!tmdbId) return Promise.resolve(null)
      return getTvDetail(tmdbId)
    },
    [tmdbId],
  )

  const seasons = (tvDetail.data?.seasons || []).filter(
    (s) => s.season_number > 0 && s.episode_count > 0,
  )
  const activeSeason = seasonNum ?? seasons[0]?.season_number ?? null

  const seasonFetch = useFetch(
    () => {
      if (!activeSeason) return Promise.resolve(null)
      return getTvSeason(tmdbId, activeSeason)
    },
    [tmdbId, activeSeason],
  )
  const episodes = seasonFetch.data?.episodes || []
  const activeEpisode = episodeNum ?? episodes[0]?.episode_number ?? null

  const stream = useFetch(
    () =>
      activeSeason && activeEpisode && tmdbId
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

  if (!hasTmdbMatch) {
    servers = buildRestrictedAnimeServers(servers)
  } else {
    servers = buildFullAnimeServers(servers)
  }

  const selectableServers = servers.filter(s => !s.disabled)

  if (tvDetail.loading) return <div className="player-loading">Loading series…</div>

  if (tvDetail.error || !tvDetail.data) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This anime couldn't be loaded.</p>
      </div>
    )
  }

  const tv = tvDetail.data
  const title = tv.name || 'This anime'
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
        (stream.loading && !selectableServers.length ? (
          <div className="player-loading">Loading player…</div>
        ) : (
          <VideoPlayer
            tmdbId={tmdbId}
            anilistId={anilistId}
            mediaType="tv"
            season={activeSeason}
            episode={activeEpisode}
            servers={selectableServers}
            title={title}
            description={overview}
            seasonOptions={seasonOptions}
            episodeOptions={episodeOptions}
            onSeasonChange={changeSeason}
            onEpisodeChange={setEpisodeNum}
            onPrev={goPrev}
            onNext={goNext}
            canPrev={canPrev}
            canNext={canNext}
            isAnime={true}
            hasTmdbMatch={hasTmdbMatch}
          />
        ))}

      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : null}
    </div>
  )
}

function buildFullAnimeServers(servers) {
  return servers.map((server) => ({
    ...server,
    disabled: false,
  }))
}

function buildRestrictedAnimeServers(servers) {
  const anilistOnlyIds = new Set(['vidrift', 'vidbolt'])
  return servers.map((server) => ({
    ...server,
    disabled: !anilistOnlyIds.has(server.id),
  }))
}

function pickTmdbShow(results, title, isMovie) {
  if (!results || results.length === 0) return null
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/gi, '')
  const target = norm(title)
  const field = isMovie ? 'title' : 'name'
  const exact = results.slice(0, 5).find((r) => norm(r[field]) === target)
  return (exact || results[0]).id
}
