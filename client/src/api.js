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

export const getMovieList = (list, page = 1) =>
  getJSON(`/api/movie/${list}?page=${page}`)

export const getTvList = (list, page = 1) =>
  getJSON(`/api/tv/${list}?page=${page}`)

export const getMovieDetail = (id) => getJSON(`/api/movie/${id}/detail`)

export const getTvDetail = (id) => getJSON(`/api/tv/${id}/detail`)

export const searchMulti = (q, page = 1) =>
  getJSON(`/api/search?q=${encodeURIComponent(q)}&page=${page}`)

// Resolve a lawful, freely-streamable video source (HLS or MP4).
export const getStream = ({ tmdbId, title, year }) =>
  getJSON(
    `/api/stream?tmdb_id=${tmdbId}&title=${encodeURIComponent(title)}` +
      (year ? `&year=${encodeURIComponent(year)}` : ''),
  )
