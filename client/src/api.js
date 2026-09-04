// Client-side API layer. All calls point directly to the FastAPI backend URL
// (resolved via Vite env), so the TMDB API key never reaches the browser.

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

async function getJSON(url) {
  const res = await fetch(`${API_BASE_URL}${url}`)
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
