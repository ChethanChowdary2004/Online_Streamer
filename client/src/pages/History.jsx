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
  const [activeTab, setActiveTab] = useState('continue')
  const [continueWatching, setContinueWatching] = useState([])
  const [watchHistory, setWatchHistory] = useState([])
  const [continueLoading, setContinueLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login')
      return
    }

    const fetchContinueWatching = async () => {
      try {
        const { data, error } = await supabase
          .from('continue_watching')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })

        if (error) throw error
        setContinueWatching(data || [])
      } catch (err) {
        console.error('Failed to fetch continue watching:', err)
        setContinueWatching([])
      } finally {
        setContinueLoading(false)
      }
    }

    const fetchWatchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })

        if (error) throw error
        setWatchHistory(data || [])
      } catch (err) {
        console.error('Failed to fetch watch history:', err)
        setWatchHistory([])
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchContinueWatching()
    fetchWatchHistory()
  }, [user, authLoading, navigate])

  const handleDeleteContinueWatching = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from continue watching?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('continue_watching')
        .delete()
        .eq('user_id', user.id)
        .eq('content_type', item.content_type)
        .eq('content_id', item.content_id)

      if (error) throw error
      setContinueWatching((prev) =>
        prev.filter(
          (i) =>
            !(
              i.content_type === item.content_type &&
              i.content_id === item.content_id
            )
        )
      )
    } catch (err) {
      console.error('Failed to delete continue watching item:', err)
    }
  }

  const handleDeleteWatchHistory = async (itemId) => {
    try {
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      setWatchHistory((prev) => prev.filter((i) => i.id !== itemId))
    } catch (err) {
      console.error('Failed to delete watch history item:', err)
    }
  }

  const handleClearAllWatchHistory = async () => {
    if (
      !window.confirm(
        'This will permanently delete all your watch history. Are you sure?'
      )
    ) {
      return
    }

    try {
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error
      setWatchHistory([])
    } catch (err) {
      console.error('Failed to clear watch history:', err)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (authLoading) return <div className="history-page"><Skeleton variant="hero" /></div>

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>My Activity</h1>

        <div className="history-tabs">
          <button
            className={`history-tab ${activeTab === 'continue' ? 'active' : ''}`}
            onClick={() => setActiveTab('continue')}
          >
            Continue Watching
          </button>
          <button
            className={`history-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Watch History
          </button>
        </div>
      </div>

      {activeTab === 'continue' && (
        <>
          <div className="history-subtitle">
            {continueWatching.length === 0
              ? 'Nothing in progress'
              : `${continueWatching.length} item${continueWatching.length !== 1 ? 's' : ''}`}
          </div>

          {continueLoading ? (
            <div className="grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card">
                  <Skeleton variant="card" />
                </div>
              ))}
            </div>
          ) : continueWatching.length === 0 ? (
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
              <h2>Nothing in progress</h2>
              <p>Start watching movies, series, and anime to resume them later</p>
              <Link to="/" className="btn btn-ghost">
                Start watching
              </Link>
            </div>
          ) : (
            <div className="grid">
              {continueWatching.map((item) => {
                const posterUrl =
                  item.content_type === 'anime'
                    ? item.poster_path
                    : imageUrl(item.poster_path)

                const progressPercent =
                  item.duration_seconds && item.duration_seconds > 0
                    ? Math.min(
                        (item.progress_seconds / item.duration_seconds) * 100,
                        100
                      )
                    : 0

                const isSeries =
                  item.content_type === 'series' ||
                  item.content_type === 'anime'
                const seasonEpisodeSuffix = isSeries
                  ? ` (S${item.season_number})(E${item.episode_number})`
                  : ''

                return (
                  <div
                    key={`${item.content_type}-${item.content_id}-${item.season_number}-${item.episode_number}`}
                    className="card"
                    onClick={() =>
                      navigate(`/watch/${item.content_type}/${item.content_id}`, {
                        state: {
                          resumeSeasonNumber: item.season_number,
                          resumeEpisodeNumber: item.episode_number,
                          resumeServerName: item.server_name,
                        },
                      })
                    }
                  >
                    <div className="card-poster-wrapper">
                      <div className="card-poster">
                        {posterUrl ? (
                          <img src={posterUrl} alt={item.title} loading="lazy" />
                        ) : (
                          <div className="card-img placeholder">
                            {item.title.slice(0, 1)}
                          </div>
                        )}
                        {progressPercent > 0 && item.duration_seconds > 0 && (
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}

                        <button
                          className="card-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteContinueWatching(item)
                          }}
                          aria-label="Remove from continue watching"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                      <FavoriteButton
                        contentType={item.content_type}
                        contentId={item.content_id}
                        title={item.title}
                        posterPath={item.poster_path}
                      />
                    </div>
                    <div className="card-title">
                      {item.title}
                      {seasonEpisodeSuffix}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          <div className="history-subtitle">
            {watchHistory.length === 0
              ? 'No watch history yet'
              : `${watchHistory.length} item${watchHistory.length !== 1 ? 's' : ''}`}
          </div>

          {watchHistory.length > 0 && (
            <button
              className="btn btn-danger history-clear-btn"
              onClick={handleClearAllWatchHistory}
            >
              Clear All
            </button>
          )}

          {historyLoading ? (
            <div className="history-list">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="history-list-item skeleton">
                  <Skeleton variant="card" />
                </div>
              ))}
            </div>
          ) : watchHistory.length === 0 ? (
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
              <p>Start watching movies, series, and anime to build your history</p>
              <Link to="/" className="btn btn-ghost">
                Start watching
              </Link>
            </div>
          ) : (
            <div className="history-list">
              {watchHistory
                .reduce((acc, item) => {
                  const key = `${item.content_type}-${item.content_id}`
                  const existing = acc.find((x) => `${x.content_type}-${x.content_id}` === key)
                  if (!existing) {
                    acc.push(item)
                  }
                  return acc
                }, [])
                .map((item) => {
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

                  const isSeries =
                    item.content_type === 'series' ||
                    item.content_type === 'anime'
                  const seasonEpisodeSuffix = isSeries
                    ? ` (S${item.season_number})(E${item.episode_number})`
                    : ''

                  return (
                    <div
                      key={item.id}
                      className="history-list-item"
                      onClick={() => navigate(detailUrl)}
                    >
                      <div className="history-list-poster">
                        {posterUrl ? (
                          <img src={posterUrl} alt={item.title} loading="lazy" />
                        ) : (
                          <div className="card-img placeholder">
                            {item.title.slice(0, 1)}
                          </div>
                        )}
                      </div>

                      <div className="history-list-content">
                        <h3 className="history-list-title">
                          {item.title}
                          {seasonEpisodeSuffix}
                        </h3>
                      </div>

                      <div className="history-list-date">
                        {formatDate(item.watched_at)}
                      </div>

                      <button
                        className="history-list-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteWatchHistory(item.id)
                        }}
                        aria-label="Delete watch history item"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
