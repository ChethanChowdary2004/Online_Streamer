import { Link, useLocation } from 'react-router-dom'

export default function Navbar({ isOpen, onClose }) {
  const location = useLocation()

  const isHomePage = location.pathname === '/'
  const isMoviesPage = location.pathname === '/movies'
  const isSeriesPage = location.pathname === '/series'
  const isAnimePage = location.pathname === '/anime'

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="nav-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`nav-sidebar ${isOpen ? 'open' : ''}`}>
        <Link
          to="/"
          className={`nav-item ${isHomePage ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-item-dot"></span>
          <span>Home</span>
        </Link>
        <Link
          to="/movies"
          className={`nav-item ${isMoviesPage ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-item-dot"></span>
          <span>Movies</span>
        </Link>
        <Link
          to="/series"
          className={`nav-item ${isSeriesPage ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-item-dot"></span>
          <span>Series</span>
        </Link>
        <Link
          to="/anime"
          className={`nav-item ${isAnimePage ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-item-dot"></span>
          <span>Anime</span>
        </Link>
      </nav>
    </>
  )
}
