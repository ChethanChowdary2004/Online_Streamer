import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAnimeGenres } from '../api'
import useFetch from '../hooks/useFetch'
import FilterSelect from './FilterSelect'

export default function Topbar({
  onToggleSidebar,
  animeQuery,
  onAnimeQuery,
  animeGenre,
  onAnimeGenre,
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  // The anime page folds its search + genre filter into the top bar, so its
  // genre list is fetched here (only while actually on /anime).
  const isAnimePage = location.pathname === '/anime'
  const genresFetch = useFetch(
    () => (isAnimePage ? getAnimeGenres() : Promise.resolve(null)),
    [isAnimePage],
  )
  const genreList = genresFetch.data?.GenreCollection || []

  // Page-level toolbars replace the global search on these routes (Movies and
  // Series have their own search + filters; the watch page has no need for it —
  // everything relevant lives under the player). Anime replaces it with its own
  // controls.
  const isBrowsedPage =
    location.pathname === '/movies' ||
    location.pathname === '/series' ||
    location.pathname.startsWith('/watch')

  return (
    <header className="navbar">
      <button
        className="navbar-toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <Link to="/" className="navbar-brand">
        <img src="/yugostream_title_transparent.png" alt="YUGOSTREAM" className="navbar-brand-image" />
      </Link>

      {isAnimePage ? (
        <div className="navbar-search anime-search">
          <input
            type="search"
            placeholder="Search anime…"
            value={animeQuery}
            onChange={(e) => onAnimeQuery(e.target.value)}
            aria-label="Search anime"
          />
          <FilterSelect
            label="Genre"
            value={animeGenre}
            onChange={onAnimeGenre}
            options={[
              { value: '', label: 'All Genres' },
              ...genreList.map((g) => ({ value: g, label: g })),
            ]}
          />
        </div>
      ) : (
        !isBrowsedPage && (
          <form className="navbar-search" onSubmit={submit}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies & shows…"
              aria-label="Search"
            />
          </form>
        )
      )}
    </header>
  )
}