import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Topbar({ onToggleSidebar }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  // Page-level toolbars replace the global search on these routes (Series has
  // its own search + filters, Anime has a search + genre filter).
  const isBrowsedPage =
    location.pathname === '/series' || location.pathname === '/anime'

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

      {!isBrowsedPage && (
        <form className="navbar-search" onSubmit={submit}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies & shows…"
            aria-label="Search"
          />
        </form>
      )}
    </header>
  )
}
