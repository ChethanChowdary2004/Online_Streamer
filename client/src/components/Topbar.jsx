import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAnimeGenres } from '../api'
import useFetch from '../hooks/useFetch'
import FilterSelect from './FilterSelect'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function Avatar({ user, profile, onClick, isUploading }) {
  const initial = (user.email?.[0] ?? '?').toUpperCase()
  if (profile?.avatar_url) {
    return (
      <button
        className={`avatar-btn ${isUploading ? 'uploading' : ''}`}
        onClick={onClick}
        aria-label="Account menu"
        disabled={isUploading}
      >
        <img src={profile.avatar_url} alt={initial} className="avatar-img" />
        {isUploading && <div className="avatar-spinner" />}
      </button>
    )
  }
  return (
    <button
      className={`avatar-btn avatar-initials ${isUploading ? 'uploading' : ''}`}
      onClick={onClick}
      aria-label="Account menu"
      disabled={isUploading}
    >
      {isUploading ? <div className="avatar-spinner" /> : initial}
    </button>
  )
}

export default function Topbar({
  animeQuery,
  onAnimeQuery,
  animeGenre,
  onAnimeGenre,
}) {
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const dropdownRef = useRef(null)
  const navMenuRef = useRef(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut, setProfile } = useAuth()

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  useEffect(() => {
    if (!navMenuOpen) return
    function handleClick(e) {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target)) {
        setNavMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [navMenuOpen])

  useEffect(() => {
    setNavMenuOpen(false)
  }, [location.pathname])

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setIsUploading(true)

    try {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('File size must be under 2MB')
        setIsUploading(false)
        return
      }

      if (!file.type.startsWith('image/')) {
        setUploadError('Please select an image file')
        setIsUploading(false)
        return
      }

      const ext = file.type.split('/')[1] || 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const publicUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setIsUploading(false)
      setDropdownOpen(false)
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
      setIsUploading(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

      <div className="mobile-menu-wrapper" ref={navMenuRef}>
        <button
          type="button"
          className={`mobile-menu-toggle ${navMenuOpen ? 'active' : ''}`}
          onClick={() => setNavMenuOpen((v) => !v)}
          aria-label="Open navigation menu"
          title="Open navigation menu"
          aria-expanded={navMenuOpen}
          aria-controls="mobile-topbar-nav"
        >
          <span />
          <span />
          <span />
        </button>
        {navMenuOpen && (
          <nav id="mobile-topbar-nav" className="mobile-menu-dropdown" aria-label="Primary navigation">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-menu-link ${location.pathname === link.to ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

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
        <form
          className={`navbar-search ${isBrowsedPage ? 'mobile-only-search' : ''}`}
          onSubmit={submit}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies & shows…"
            aria-label="Search"
          />
        </form>
      )}

      <div className="navbar-right">
        {user && (
          <>
            <button
              className={`history-btn ${location.pathname === '/history' ? 'active' : ''}`}
              onClick={() => navigate('/history')}
              aria-label="View history"
              title="View history"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v6l5.25 3.15.75-1.23-4-2.42z" />
              </svg>
            </button>

            <button
              className={`favorites-btn ${location.pathname === '/favorites' ? 'active' : ''}`}
              onClick={() => navigate('/favorites')}
              aria-label="View favorites"
              title="View favorites"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </>
        )}

        <div className="navbar-auth" ref={dropdownRef}>
          {user ? (
            <div className="avatar-wrapper">
              <Avatar user={user} profile={profile} onClick={() => setDropdownOpen((v) => !v)} isUploading={isUploading} />
              {dropdownOpen && (
                <div className="avatar-dropdown">
                  <div className="avatar-dropdown-email">{user.email}</div>
                  {uploadError && (
                    <div className="avatar-dropdown-error">{uploadError}</div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    aria-label="Upload avatar"
                  />
                  <button
                    className="avatar-dropdown-upload"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload photo'}
                  </button>
                  <button
                    className="avatar-dropdown-logout"
                    onClick={async () => { setDropdownOpen(false); await signOut(); navigate('/logout') }}
                    disabled={isUploading}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}