import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { supabase } from '../lib/supabase'
import { imageUrl } from '../api'
import FavoriteButton from '../components/FavoriteButton'
import Skeleton from '../components/Skeleton'

export default function Favorites() {
  const { user, loading: authLoading } = useAuth()
  const { loading: favoritesLoading } = useFavorites()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login')
      return
    }

    const fetchFavorites = async () => {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFavorites(data || [])
      } catch (err) {
        console.error('Failed to fetch favorites:', err)
        setFavorites([])
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [user, authLoading, navigate])

  if (authLoading || favoritesLoading) return <div className="favorites-page"><Skeleton variant="hero" /></div>

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <h1>My Favorites</h1>
        <p className="favorites-subtitle">
          {favorites.length === 0 ? 'No favorites yet' : `${favorites.length} item${favorites.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card">
              <Skeleton variant="card" />
            </div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="favorites-empty">
          <div className="favorites-empty-icon">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h2>No favorites yet</h2>
          <p>Start adding your favorite movies, series, and anime to see them here</p>
          <Link to="/" className="btn btn-ghost">
            Explore content
          </Link>
        </div>
      ) : (
        <div className="grid">
          {favorites.map((fav) => {
            const detailUrl =
              fav.content_type === 'series'
                ? `/tv/${fav.content_id}`
                : fav.content_type === 'anime'
                  ? `/anime/${fav.content_id}`
                  : `/movie/${fav.content_id}`

            const posterUrl =
              fav.content_type === 'anime'
                ? fav.poster_path
                : imageUrl(fav.poster_path)

            return (
              <div key={fav.id} className="card">
                <div className="card-poster-wrapper">
                  <Link to={detailUrl} className="card-poster">
                    {posterUrl ? (
                      <img src={posterUrl} alt={fav.title} loading="lazy" />
                    ) : (
                      <div className="card-img placeholder">{fav.title.slice(0, 1)}</div>
                    )}
                  </Link>
                  <FavoriteButton
                    contentType={fav.content_type}
                    contentId={fav.content_id}
                    title={fav.title}
                    posterPath={fav.poster_path}
                  />
                </div>
                <div className="card-title">{fav.title}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

