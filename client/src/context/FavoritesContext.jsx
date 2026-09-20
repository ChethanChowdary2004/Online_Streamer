import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const FavoritesContext = createContext()

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favoriteKeys, setFavoriteKeys] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setFavoriteKeys(new Set())
      return
    }

    const fetchFavorites = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('content_type, content_id')
          .eq('user_id', user.id)

        if (error) throw error

        const keys = new Set(
          (data || []).map((fav) => `${fav.content_type}:${fav.content_id}`)
        )
        setFavoriteKeys(keys)
      } catch (err) {
        console.error('Failed to fetch favorites:', err)
        setFavoriteKeys(new Set())
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [user])

  const isFavorited = (contentType, contentId) => {
    return favoriteKeys.has(`${contentType}:${contentId}`)
  }

  const addFavorite = async (contentType, contentId, title, posterPath) => {
    const key = `${contentType}:${contentId}`

    setFavoriteKeys((prev) => new Set([...prev, key]))

    try {
      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        title,
        poster_path: posterPath,
      })

      if (error) throw error
    } catch (err) {
      console.error('Failed to add favorite:', err)
      setFavoriteKeys((prev) => {
        const updated = new Set(prev)
        updated.delete(key)
        return updated
      })
    }
  }

  const removeFavorite = async (contentType, contentId) => {
    const key = `${contentType}:${contentId}`

    setFavoriteKeys((prev) => {
      const updated = new Set(prev)
      updated.delete(key)
      return updated
    })

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to remove favorite:', err)
      setFavoriteKeys((prev) => new Set([...prev, key]))
    }
  }

  return (
    <FavoritesContext.Provider
      value={{ isFavorited, addFavorite, removeFavorite, loading, favoriteKeys }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
