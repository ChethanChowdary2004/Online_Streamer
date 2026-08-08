import { useSearchParams } from 'react-router-dom'
import { searchMulti } from '../api'
import useFetch from '../hooks/useFetch'
import MovieCard from '../components/MovieCard'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const { data, error, loading } = useFetch(
    () => (q ? searchMulti(q) : Promise.resolve({ results: [] })),
    [q],
  )

  const results = data?.results || []

  return (
    <div className="search-page">
      <h2>{q ? `Results for "${q}"` : 'Search movies & shows'}</h2>

      {loading && <div className="spinner" />}
      {error && <div className="error-box">Search failed: {error.message}</div>}
      {!loading && !error && results.length === 0 && q && (
        <div className="search-empty">No results for "{q}". Try another title.</div>
      )}
      {!loading && !error && results.length > 0 && (
        <div className="grid">
          {results.map((r) => (
            <MovieCard key={`${r.media_type}-${r.id}`} item={r} type={r.media_type} />
          ))}
        </div>
      )}
    </div>
  )
}