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
import useWatchHistory from '../hooks/useWatchHistory'
import VideoPlayer from '../components/VideoPlayer'
import AnimeRow from '../components/AnimeRow'
import { animeTitle } from '../components/AnimeCard'

export default function AnimePlayerPage({ anilistId }) {
  const crossover = useFetch(
    () =>
      getAnimeDetail(anilistId).then(async (d) => {
        const media = d?.Media
        if (!media) return { title: null, tmdbId: null, mediaType: null, relations: [], anilistId: null }
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
        return { title, tmdbId, mediaType, relations, anilistId: media.id, posterPath: media.coverImage?.large }
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

  const { title, tmdbId, mediaType, relations, anilistId: mediaAnilistId, posterPath } = crossover.data
  const hasTmdbMatch = Boolean(tmdbId)

  if (mediaType === 'movie') {
    return (
      <MovieAnimePlayer
        tmdbId={tmdbId}
        anilistId={mediaAnilistId}
        animeRelations={relations}
        hasTmdbMatch={hasTmdbMatch}
        title={title}
        posterPath={posterPath}
      />
    )
  }

  return (
    <SeriesAnimePlayer
      tmdbId={tmdbId}
      anilistId={mediaAnilistId}
      animeRelations={relations}
      hasTmdbMatch={hasTmdbMatch}
      title={title}
      posterPath={posterPath}
    />
  )
}

function MovieAnimePlayer({ tmdbId, anilistId, animeRelations, hasTmdbMatch, title, posterPath }) {
  const { data, error, loading } = useFetch(async () => {
    const d = await getAnimeDetail(anilistId)
    const media = d?.Media
    const title = media ? animeTitle(media.title) : 'This anime'
    const year = (media?.startDate?.year || '').toString()

    let servers = []
    let overview = media?.description || ''

    if (hasTmdbMatch && tmdbId) {
      const res = await getStream({
        tmdbId,
        title,
        year,
        mediaType: 'movie',
      })
      servers = res.servers || []
    } else if (anilistId) {
      servers = [
        {
          id: 'vidrift',
          name: 'VidRift',
          embedUrl: `https://embed.vidrift.in/embed/movie/${anilistId}`,
          supportsAnilist: false,
          disabled: false,
        },
        {
          id: 'vidbolt',
          name: 'VidBolt',
          embedUrl: `https://vidbolt.xyz/anime/${anilistId}`,
          supportsAnilist: false,
          disabled: false,
        },
      ]
    }

    return {
      title,
      servers,
      overview,
    }
  }, [tmdbId, anilistId, hasTmdbMatch])

  useWatchHistory('anime', anilistId, title, posterPath)

  if (loading) return <div className="player-loading">Loading stream…</div>

  if (error || !data?.servers?.length) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This anime couldn't be found on any supported server.</p>
      </div>
    )
  }

  let servers = data.servers

  if (!hasTmdbMatch) {
    servers = servers.map((server) => ({
      ...server,
      disabled: !['vidrift', 'vidbolt'].includes(server.id),
    }))
  } else {
    servers = servers.map((server) => ({
      ...server,
      disabled: false,
    }))
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

function SeriesAnimePlayer({ tmdbId, anilistId, animeRelations, hasTmdbMatch, title, posterPath }) {
  const [seasonNum, setSeasonNum] = useState(null)
  const [episodeNum, setEpisodeNum] = useState(null)

  const tvDetail = useFetch(
    () => {
      if (hasTmdbMatch && tmdbId) {
        return getTvDetail(tmdbId)
      }
      return Promise.resolve(null)
    },
    [tmdbId, hasTmdbMatch],
  )

  const seasons = (tvDetail.data?.seasons || []).filter(
    (s) => s.season_number > 0 && s.episode_count > 0,
  )
  const activeSeason = seasonNum ?? seasons[0]?.season_number ?? 1
  const activeEpisode = episodeNum ?? 1

  const seasonFetch = useFetch(
    () => {
      if (hasTmdbMatch && tmdbId && activeSeason) {
        return getTvSeason(tmdbId, activeSeason)
      }
      return Promise.resolve(null)
    },
    [tmdbId, activeSeason, hasTmdbMatch],
  )
  const episodes = seasonFetch.data?.episodes || []

  const stream = useFetch(
    () => {
      if (hasTmdbMatch && tmdbId && activeSeason && activeEpisode) {
        return getStream({
          tmdbId,
          mediaType: 'tv',
          season: activeSeason,
          episode: activeEpisode,
        })
      }
      return Promise.resolve(null)
    },
    [tmdbId, activeSeason, activeEpisode, hasTmdbMatch],
  )

  useWatchHistory('anime', anilistId, title, posterPath, activeSeason, activeEpisode)

  let servers = stream.data?.servers || []

  if (!hasTmdbMatch) {
    servers = [
      {
        id: 'vidrift',
        name: 'VidRift',
        embedUrl: `https://embed.vidrift.in/embed/tv/${anilistId}/1/${activeEpisode}`,
        supportsAnilist: false,
        disabled: false,
      },
      {
        id: 'vidbolt',
        name: 'VidBolt',
        embedUrl: `https://vidbolt.xyz/anime/${anilistId}/${activeEpisode}`,
        supportsAnilist: false,
        disabled: false,
      },
    ]
  } else {
    servers = servers.map((server) => ({
      ...server,
      disabled: false,
      supportsAnilist: ['vidrift', 'vidbolt'].includes(server.id) ? true : false,
    }))
  }

  const selectableServers = servers.filter(s => !s.disabled)

  const animeDetail = useFetch(() => getAnimeDetail(anilistId), [anilistId])
  const tv = tvDetail.data
  const displayTitle = tv?.name || (animeDetail.data?.Media ? animeTitle(animeDetail.data.Media.title) : 'This anime')
  const overview = tv?.overview || animeDetail.data?.Media?.description || ''

  const seasonOptions = seasons.map((s) => ({
    value: String(s.season_number),
    label: s.name || `Season ${s.season_number}`,
  }))
  const episodeOptions = episodes.map((ep) => ({
    value: String(ep.episode_number),
    label: `${ep.episode_number}. ${ep.name || `Episode ${ep.episode_number}`}`,
  }))

  const lastEpisode = episodes[episodes.length - 1]?.episode_number ?? activeEpisode
  const nextSeason = hasTmdbMatch && seasons.find((s) => s.season_number === activeSeason + 1)
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

  const changeEpisode = (val) => {
    setEpisodeNum(Number(val))
  }

  if (hasTmdbMatch && tvDetail.loading) {
    return <div className="player-loading">Loading series…</div>
  }

  if (hasTmdbMatch && tvDetail.error) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This anime couldn't be loaded.</p>
      </div>
    )
  }

  return (
    <div className="player-page">
      {activeSeason && activeEpisode ? (
        <VideoPlayer
          tmdbId={tmdbId}
          anilistId={anilistId}
          mediaType="tv"
          season={activeSeason}
          episode={activeEpisode}
          servers={selectableServers}
          title={displayTitle}
          description={overview}
          seasonOptions={hasTmdbMatch ? seasonOptions : []}
          episodeOptions={hasTmdbMatch ? episodeOptions : []}
          onSeasonChange={hasTmdbMatch ? changeSeason : undefined}
          onEpisodeChange={changeEpisode}
          onPrev={hasTmdbMatch ? goPrev : undefined}
          onNext={hasTmdbMatch ? goNext : undefined}
          canPrev={canPrev}
          canNext={canNext}
          isAnime={true}
          hasTmdbMatch={hasTmdbMatch}
        />
      ) : (
        <div className="player-loading">Loading…</div>
      )}

      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : null}
    </div>
  )
}

function pickTmdbShow(results, title, isMovie) {
  if (!results || results.length === 0) return null
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/gi, '')
  const target = norm(title)
  const field = isMovie ? 'title' : 'name'
  const exact = results.slice(0, 5).find((r) => norm(r[field]) === target)
  return (exact || results[0]).id
}
