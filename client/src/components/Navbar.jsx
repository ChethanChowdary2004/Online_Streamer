import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  // Hide navbar search on Series page (has its own search)
  const isSeriesPage = location.pathname === '/series'

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        Stream<span>Hub</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/series">Series</Link>
      </nav>
      {!isSeriesPage && (
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