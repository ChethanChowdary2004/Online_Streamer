import { useEffect, useState } from 'react'
import { getGenres, discoverMovies, searchMovies } from '../api'
import useFetch from '../hooks/useFetch'
import FilterSelect from '../components/FilterSelect'
import MovieCard from '../components/MovieCard'

// Popularity sort presets (TMDB discover sort_by values + labels).
const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popular' },
  { value: 'vote_average.desc', label: 'Most Rated' },
  { value: 'primary_release_date.desc', label: 'Newest' },
]

// Language filter choices (ISO 639-1 codes). Telugu + Tamil first, then the
// commonly available original languages.
const LANGUAGES = [
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ur', label: 'Urdu' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
]

export default function Movies() {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [sortBy, setSortBy] = useState('popularity.desc')
  const [language, setLanguage] = useState('')

  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const genresFetch = useFetch(() => getGenres(), [])
  const genreList = genresFetch.data?.movie || []

  const queryTrim = query.trim()

  // Discover when filtering, /search/movie when a name is typed. Filtering uses a
  // text search can't also apply genre/language, so a typed query takes over.
  const buildRequest = (p) =>
    queryTrim
      ? searchMovies(queryTrim, p)
      : discoverMovies({
          with_genres: genre || undefined,
          with_original_language: language || undefined,
          sort_by: sortBy,
          ...(sortBy === 'vote_average.desc' ? { 'vote_count.gte': 50 } : {}),
          page: p,
        })

  // First page — refetches whenever any filter changes.
  const base = useFetch(() => buildRequest(1), [queryTrim, genre, sortBy, language])

  // Replace the visible set whenever a fresh first-page result arrives.
  useEffect(() => {
    if (!base.data) return
    const d = base.data
    setItems(d.results || [])
    setPage(1)
    setHasMore(Boolean(d.page && d.total_pages && d.page < d.total_pages))
  }, [base.data])

  // Append the next page to the existing grid.
  const loadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    try {
      const d = await buildRequest(next)
      setItems((prev) => [...prev, ...(d.results || [])])
      setPage(next)
      setHasMore(Boolean(d.page && d.total_pages && d.page < d.total_pages))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="series-page">
      <h1 className="series-title">Movies</h1>

      <div className="series-toolbar">
        <input
          className="series-search-input"
          type="search"
          placeholder="Search movies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search movies"
        />

        <div className="series-filters-row">
          <FilterSelect
            label="Genre"
            value={genre}
            onChange={setGenre}
            options={[{ value: '', label: 'All Genres' }, ...genreList.map((g) => ({ value: String(g.id), label: g.name }))]}
          />

          <FilterSelect
            label="Sort"
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
          />

          <FilterSelect
            label="Language"
            value={language}
            onChange={setLanguage}
            options={[{ value: '', label: 'All Languages' }, ...LANGUAGES.map((l) => ({ value: l.code, label: l.label }))]}
          />
        </div>
      </div>

      {base.loading && <div className="spinner" />}
      {base.error && (
        <div className="error-box">Failed to load movies: {base.error.message}</div>
      )}
      {!base.loading && !base.error && items.length === 0 && (
        <div className="search-empty">
          {queryTrim ? `No movies found for "${queryTrim}".` : 'No movies found.'}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="series-grid">
            {items.map((s) => (
              <MovieCard key={s.id} item={{ ...s, media_type: 'movie' }} type="movie" />
            ))}
          </div>
          <div className="series-load">
            <button
              className="btn btn-ghost"
              onClick={loadMore}
              disabled={loadingMore || !hasMore}
            >
              {loadingMore ? 'Loading…' : hasMore ? 'Load More' : 'No more movies'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}