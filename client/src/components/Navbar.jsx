import { Link, useLocation } from 'react-router-dom'

export default function Navbar({ isOpen, onClose }) {
  const location = useLocation()

  const isHomePage = location.pathname === '/'
  const isSeriesPage = location.pathname === '/series'

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
          to="/series"
          className={`nav-item ${isSeriesPage ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-item-dot"></span>
          <span>Series</span>
        </Link>
      </nav>
    </>
  )
}
