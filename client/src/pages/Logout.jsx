import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrending, imageUrl } from '../api'

export default function Logout() {
  const [posters, setPosters] = useState([])
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const fetchPosters = async () => {
      try {
        const data = await getTrending('movie', 'week')
        const movies = data.results?.slice(0, 12) || []
        setPosters(movies)
      } catch (err) {
        console.error('Failed to fetch posters:', err)
      }
    }
    fetchPosters()
  }, [])

  const handleLoginClick = () => {
    setIsExiting(true)
    setTimeout(() => {
      window.location.href = '/login'
    }, 600)
  }

  return (
    <div className={`logout-container ${isExiting ? 'exiting' : ''}`}>
      <div className="logout-bg">
        {posters.map((movie, i) => (
          <div
            key={i}
            className="poster-item"
            style={{
              backgroundImage: `url("${imageUrl(movie.poster_path, 'w342')}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="logout-overlay" />

      <div className="logout-content">
        <div className="logout-logo">
          <img src="/yugostream_title_transparent.png" alt="YUGOSTREAM" className="logout-logo-img" />
        </div>

        <div className="logout-message">
          <h1>See you soon!</h1>
          <p>You've been signed out</p>
        </div>

        <div className="logout-actions">
          <button className="logout-btn-primary" onClick={handleLoginClick}>
            Sign in again
          </button>
          <Link to="/" className="logout-btn-secondary">
            Continue as guest
          </Link>
        </div>

        <div className="logout-footer">
          <p>Come back anytime to continue your story</p>
        </div>
      </div>

      <div className="logout-animated-circles">
        <div className="circle circle-1" />
        <div className="circle circle-2" />
        <div className="circle circle-3" />
      </div>
    </div>
  )
}
