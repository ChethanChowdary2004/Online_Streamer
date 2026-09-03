import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getMovieDetail,
  getTvDetail,
  getTvSeason,
  getStream,
  getAnimeDetail,
  searchTv,
  searchMovies,
} from '../api'
import useFetch from '../hooks/useFetch'
import VideoPlayer from '../components/VideoPlayer'
import MovieRow from '../components/MovieRow'
import AnimeRow from '../components/AnimeRow'
import { animeTitle } from '../components/AnimeCard'

export default function PlayerPage() {
  const { type, id } = useParams()

  if (type === 'movie') return <MoviePlayer tmdbId={id} />
  if (type === 'tv') return <TvPlayer tmdbId={id} />
  if (type === 'anime') return <AnimePlayer anilistId={id} />

  return (
    <div className="vplayer-error">
      <h3>Unsupported media</h3>
      <p>This media type can't be watched here.</p>
    </div>
  )
}

function MoviePlayer({ tmdbId, anilistId, animeRelations, videasyOnly = false }) {
  const { data, error, loading } = useFetch(async () => {
    const d = await getMovieDetail(tmdbId)
    const title = d.title || 'This title'
    const year = (d.release_date || '').slice(0, 4)
    const res = await getStream({ tmdbId, title, year, mediaType: 'movie' })
    return {
      title,
      year,
      servers: res.servers || [],
      overview: d.overview || '',
      similar: (d.similar && d.similar.results) || [],
    }
  }, [tmdbId])

  if (loading) return <div className="player-loading">Loading stream…</div>

  if (error || !data?.servers?.length) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>
          "{data?.title || 'This title'}" couldn't be loaded. Try another title.
        </p>
      </div>
    )
  }

  let servers = data.servers
  if (videasyOnly) {
    servers = servers.filter((s) => s.id === 'videasy')
  }

  return (
    <div className="player-page">
      <VideoPlayer
        tmdbId={tmdbId}
        mediaType="movie"
        servers={servers}
        anilistId={anilistId}
        title={data.title}
        description={data.overview}
      />
      {animeRelations && animeRelations.length ? (
        <AnimeRow title="Related Anime" items={animeRelations} />
      ) : (
        <MovieRow title="Similar Movies" items={data.similar} type="movie" />
      )}
    </div>
  )
}

function TvPlayer({ tmdbId, anilistId, animeRelations, videasyOnly = false }) {
  const { data: tv, error, loading } = useFetch(() => getTvDetail(tmdbId), [
    tmdbId,
  ])
  const [seasonNum, setSeasonNum] = useState(null)
  const [episodeNum, setEpisodeNum] = useState(null)

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

  if (videasyOnly) {
    servers = servers.filter((s) => s.id === 'videasy')
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

  const title = tv.name || 'This series'
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

function AnimePlayer({ anilistId }) {
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
      <MoviePlayer
        tmdbId={tmdbId}
        anilistId={anilistId}
        animeRelations={relations}
        videasyOnly={!tmdbId}
      />
    )
  }

  return (
    <TvPlayer
      tmdbId={tmdbId}
      anilistId={anilistId}
      animeRelations={relations}
      videasyOnly={!tmdbId}
    />
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
