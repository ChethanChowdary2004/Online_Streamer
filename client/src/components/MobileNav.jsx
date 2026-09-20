import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path
  }

  const handleProfileClick = () => {
    if (user) {
      navigate('/favorites')
    } else {
      navigate('/login')
    }
  }

  return (
    <nav className="mobile-nav">
      <Link
        to="/"
        className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
        aria-label="Home"
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <span className="mobile-nav-label">Home</span>
      </Link>

      <Link
        to="/search"
        className={`mobile-nav-item ${isActive('/search') ? 'active' : ''}`}
        aria-label="Search"
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <span className="mobile-nav-label">Search</span>
      </Link>

      <Link
        to="/favorites"
        className={`mobile-nav-item ${isActive('/favorites') ? 'active' : ''}`}
        aria-label="Favorites"
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span className="mobile-nav-label">Favorites</span>
      </Link>

      <Link
        to="/history"
        className={`mobile-nav-item ${isActive('/history') ? 'active' : ''}`}
        aria-label="History"
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v6l5.25 3.15.75-1.23-4-2.42z" />
        </svg>
        <span className="mobile-nav-label">History</span>
      </Link>

      <button
        type="button"
        className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}
        onClick={handleProfileClick}
        aria-label="Profile"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span className="mobile-nav-label">Profile</span>
      </button>
    </nav>
  )
}
