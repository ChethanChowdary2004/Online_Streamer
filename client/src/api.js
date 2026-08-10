// Client-side API layer. All calls go through the Vite dev proxy (/api) to the
// FastAPI backend, so the TMDB API key never reaches the browser.

const IMAGE_BASE = 'https://image.tmdb.org/t/p'

async function getJSON(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

// Build an absolute TMDB image URL; returns '' when no path is available.
export function imageUrl(path, size = 'w500') {
  return path ? `${IMAGE_BASE}/${size}${path}` : ''
}

// Serialize a params object into a query string (skips null/'' values).
function qs(params = {}) {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export const getMovieList = (list, page = 1) =>
  getJSON(`/api/movie/${list}?page=${page}`)

export const getTvList = (list, page = 1) =>
  getJSON(`/api/tv/${list}?page=${page}`)

export const getTrending = (media_type = 'movie', time_window = 'week') =>
  getJSON(`/api/trending?media_type=${media_type}&time_window=${time_window}`)

// TMDB discover shelves (genre/keyword filtered), e.g.
// discoverMovies({ with_genres: '28,12' }) or discoverTv({ with_keywords: 210024 }).
export const discoverMovies = (params = {}) =>
  getJSON(`/api/discover/movie?${qs(params)}`)

export const discoverTv = (params = {}) =>
  getJSON(`/api/discover/tv?${qs(params)}`)

export const getMovieDetail = (id) => getJSON(`/api/movie/${id}/detail`)

export const getTvDetail = (id) => getJSON(`/api/tv/${id}/detail`)

export const getTvSeason = (id, season) =>
  getJSON(`/api/tv/${id}/season/${season}`)

export const searchMulti = (q, page = 1) =>
  getJSON(`/api/search?q=${encodeURIComponent(q)}&page=${page}`)

// TV-only search for the Series page.
export const searchTv = (q, page = 1) =>
  getJSON(`/api/search/tv?q=${encodeURIComponent(q)}&page=${page}`)

// Movie + TV genre lists for filter dropdowns.
export const getGenres = () => getJSON('/api/genres')

// Resolve the embed servers (WFS + VidLink) for a movie or TV title.
// TV shows pass season + episode so each provider gets the right URL.
export const getStream = ({ tmdbId, title, year, mediaType, season, episode }) => {
  const params = new URLSearchParams({ tmdb_id: tmdbId, title })
  if (year) params.set('year', year)
  if (mediaType) params.set('media_type', mediaType)
  if (season) params.set('season', season)
  if (episode) params.set('episode', episode)
  return getJSON(`/api/stream?${params}`)
}

// --- Anime (AniList) ---
// AniList responses stay in their raw shape (Page.media.* / Media.*). Cover
// and banner URLs are absolute, so no imageUrl() mapping is needed here.

// Unwrap the media array that every anime shelf/search query returns under Page.
export const animeMedia = (data) => data?.Page?.media || []

// AniList shelf: trending / top-rated / latest / movies.
export const getAnimeList = (list, page = 1) =>
  getJSON(`/api/anime/${list}?page=${page}`)

// Single-genre browse shelf (/api/anime/genre/{genre}).
export const getAnimeGenre = (genre, page = 1) =>
  getJSON(`/api/anime/genre/${encodeURIComponent(genre)}?page=${page}`)

export const searchAnime = (q, page = 1) =>
  getJSON(`/api/anime/search?q=${encodeURIComponent(q)}&page=${page}`)

// Genre tags for the filter dropdown.
export const getAnimeGenres = () => getJSON('/api/anime/genres')

export const getAnimeDetail = (id) => getJSON(`/api/anime/${id}/detail`)

// VIDEASY anime embed. Shows take an episode number; movies only need the
// AniList ID. The player provides subbed + dubbed versions automatically.
export const animeEmbed = (anilistId, episode) =>
  episode
    ? `https://player.videasy.net/anime/${anilistId}/${episode}`
    : `https://player.videasy.net/anime/${anilistId}`
