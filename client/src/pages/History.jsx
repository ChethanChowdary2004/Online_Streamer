import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { imageUrl } from '../api'
import FavoriteButton from '../components/FavoriteButton'
import Skeleton from '../components/Skeleton'

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login')
      return
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })

        if (error) throw error
        setHistory(data || [])
      } catch (err) {
        console.error('Failed to fetch watch history:', err)
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user, authLoading, navigate])

  if (authLoading) return <div className="history-page"><Skeleton variant="hero" /></div>

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Watch History</h1>
        <p className="history-subtitle">
          {history.length === 0 ? 'No watch history yet' : `${history.length} item${history.length !== 1 ? 's' : ''}`}
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
      ) : history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v6l5.25 3.15.75-1.23-4-2.42z" />
            </svg>
          </div>
          <h2>No watch history yet</h2>
          <p>Start watching movies, series, and anime to see them here</p>
          <Link to="/" className="btn btn-ghost">
            Start watching
          </Link>
        </div>
      ) : (
        <div className="grid">
          {history.map((item) => {
            const detailUrl =
              item.content_type === 'series'
                ? `/tv/${item.content_id}`
                : item.content_type === 'anime'
                  ? `/anime/${item.content_id}`
                  : `/movie/${item.content_id}`

            const posterUrl =
              item.content_type === 'anime'
                ? item.poster_path
                : imageUrl(item.poster_path)

            const hasSeason = item.season_number && item.season_number > 0
            const hasEpisode = item.episode_number && item.episode_number > 0

            return (
              <div key={item.id} className="card">
                <Link to={detailUrl} className="card-poster">
                  {posterUrl ? (
                    <img src={posterUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="card-img placeholder">{item.title.slice(0, 1)}</div>
                  )}
                  {hasSeason && hasEpisode && (
                    <div className="card-badge">S{item.season_number} E{item.episode_number}</div>
                  )}
                </Link>
                <FavoriteButton
                  contentType={item.content_type}
                  contentId={item.content_id}
                  title={item.title}
                  posterPath={item.poster_path}
                />
                <div className="card-title">{item.title}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
