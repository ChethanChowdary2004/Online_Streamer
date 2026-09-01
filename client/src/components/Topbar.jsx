import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAnimeGenres } from '../api'
import useFetch from '../hooks/useFetch'
import FilterSelect from './FilterSelect'

export default function Topbar({
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

  const isAnimePage = location.pathname === '/anime'
  const genresFetch = useFetch(
    () => (isAnimePage ? getAnimeGenres() : Promise.resolve(null)),
    [isAnimePage],
  )
  const genreList = genresFetch.data?.GenreCollection || []

  const isBrowsedPage =
    location.pathname === '/movies' ||
    location.pathname === '/series' ||
    location.pathname.startsWith('/watch')

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/movies', label: 'Movies' },
    { to: '/series', label: 'Series' },
    { to: '/anime', label: 'Anime' },
  ]

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <img src="/yugostream_title_transparent.png" alt="YUGOSTREAM" className="navbar-brand-image" />
      </Link>

      <nav className="nav-links">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

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