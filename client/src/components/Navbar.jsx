import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        Stream<span>Hub</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Home</Link>
      </nav>
      <form className="navbar-search" onSubmit={submit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies & shows…"
          aria-label="Search"
        />
      </form>
    </header>
  )
}