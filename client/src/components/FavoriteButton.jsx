import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'

export default function FavoriteButton({ contentType, contentId, title, posterPath }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorited, addFavorite, removeFavorite } = useFavorites()

  const favorited = isFavorited(contentType, contentId)

  const handleClick = async (e) => {
    e.stopPropagation()

    if (!user) {
      navigate('/login')
      return
    }

    try {
      if (favorited) {
        await removeFavorite(contentType, contentId)
      } else {
        await addFavorite(contentType, contentId, title, posterPath)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  return (
    <button
      className={`favorite-btn ${favorited ? 'favorited' : ''}`}
      onClick={handleClick}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className="favorite-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  )
}


