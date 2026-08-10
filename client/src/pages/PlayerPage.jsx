import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getMovieDetail,
  getTvDetail,
  getTvSeason,
  getStream,
  getAnimeDetail,
  searchTv,
  animeEmbed,
} from '../api'
import useFetch from '../hooks/useFetch'
import FilterSelect from '../components/FilterSelect'
import VideoPlayer from '../components/VideoPlayer'
import { animeTitle } from '../components/AnimeCard'

// Plays everything through VideoPlayer.
//   /watch/movie/:id  -> MoviePlayer  (WFS + VidLink servers from /api/stream)
//   /watch/tv/:id     -> TvPlayer     (season + episode, served per episode)
//   /watch/anime/:id  -> AnimePlayer  (AniList ID resolves a TMDB id, then TV)
//
// Movie/Tv resolve their server list on the backend. Anime only knows its
// AniList ID, so AnimePlayer finds the matching TMDB show by title and reuses
// the TV flow — this gives anime the full server list + season/episode
// pickers. VIDEASY additionally gets a TMDB/AniList toggle (in VideoPlayer) so
// the same title can be played from either id.

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

// ---- TV shows (anime delegates here after resolving its TMDB id) ----
function TvPlayer({ tmdbId, anilistId }) {
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
            anilistId={anilistId}
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

// ---- Anime (AniList ID -> resolve a TMDB id -> shared TV flow) ----
// The anime page only tells us the AniList ID, but the shared servers (and the
// season/episode pickers) need a TMDB id. So: fetch the AniList detail, search
// TMDB by title to recover its tmdb id, then delegate to TvPlayer — same flow
// as any series. VIDEASY gets the AniList id too, so VideoPlayer can toggle its
// embed between the TMDB and AniList ids.
function AnimePlayer({ anilistId }) {
  const crossover = useFetch(
    () =>
      getAnimeDetail(anilistId).then(async (d) => {
        const media = d?.Media
        if (!media) return { title: null, tmdbId: null }
        const title = animeTitle(media.title)
        const search = await searchTv(title)
        return { title, tmdbId: pickTmdbShow(search?.results, title) }
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

  // No TMDB counterpart found (rare/obscure title) — fall back to the
  // AniList-only VIDEASY embed rather than dead WFS/VidLink servers.
  if (!crossover.data.tmdbId) {
    return <AnimeEmbedOnly anilistId={anilistId} />
  }

  return <TvPlayer tmdbId={crossover.data.tmdbId} anilistId={anilistId} />
}

// Pick the TMDB show that best matches a title. Prefers an exact-ish name
// match among the first few results, otherwise takes the top result.
function pickTmdbShow(results, title) {
  if (!results || results.length === 0) return null
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/gi, '')
  const target = norm(title)
  const exact = results.slice(0, 5).find((r) => norm(r.name) === target)
  return (exact || results[0]).id
}

// Last-resort player when an anime has no TMDB listing: a single VIDEASY
// embed from the AniList ID (movies: /anime/{id}; shows: /anime/{id}/{ep}).
function AnimeEmbedOnly({ anilistId }) {
  const { data, error, loading } = useFetch(() => getAnimeDetail(anilistId), [
    anilistId,
  ])
  const [episode, setEpisode] = useState(null)

  if (loading) return <div className="player-loading">Loading anime…</div>

  if (error || !data?.Media) {
    return (
      <div className="vplayer-error">
        <h3>No playable video here</h3>
        <p>This anime couldn't be loaded.</p>
      </div>
    )
  }

  const media = data.Media
  const title = animeTitle(media.title)
  const year = media.startDate?.year
  const isMovie = media.format === 'MOVIE'
  const episodeCount = media.episodes
  const activeEpisode = episode ?? 1
  const showPicker = !isMovie && episodeCount > 1

  // A single server; VIDEASY handles sub/dub switching inside the embed.
  const servers = [
    {
      id: 'videasy',
      name: 'VIDEASY',
      embedUrl: animeEmbed(anilistId, isMovie ? null : activeEpisode),
    },
  ]

  const episodeNumbers = Array.from(
    { length: episodeCount || 0 },
    (_, i) => i + 1,
  )

  return (
    <div className="player-page">
      <VideoPlayer servers={servers} />

      <h2 className="player-title">{title}</h2>

      {showPicker && (
        <div className="player-selectors">
          <FilterSelect
            label="Episode"
            value={String(activeEpisode)}
            onChange={(val) => setEpisode(val ? Number(val) : null)}
            options={episodeNumbers.map((n) => ({
              value: String(n),
              label: `Episode ${n}`,
            }))}
          />
        </div>
      )}

      <p className="player-sub">
        {title}
        {year ? ` · ${year}` : ''}
        {isMovie ? ' · Anime Movie' : ` · Episode ${activeEpisode}`}
      </p>
    </div>
  )
}