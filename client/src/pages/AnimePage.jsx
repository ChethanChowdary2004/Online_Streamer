import { useEffect, useState } from 'react'
import {
  searchAnime,
  getAnimeGenre,
  getAnimeList,
  getAnimeGenres,
  animeMedia,
} from '../api'
import useFetch from '../hooks/useFetch'
import AnimeTopbar from '../components/AnimeTopbar'
import AnimeHeroBanner from '../components/AnimeHeroBanner'
import AnimeRow from '../components/AnimeRow'
import AnimeCard from '../components/AnimeCard'

export default function AnimePage() {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')

  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const genresFetch = useFetch(() => getAnimeGenres(), [])
  const genreList = genresFetch.data?.GenreCollection || []

  const queryTrim = query.trim()
  const browsing = Boolean(queryTrim || genre)

  // Shelves for the idle (non-browsing) layout.
  const trending = useFetch(() => getAnimeList('trending'), [])
  const topRated = useFetch(() => getAnimeList('top-rated'), [])
  const movies = useFetch(() => getAnimeList('movies'), [])
  const latest = useFetch(() => getAnimeList('latest'), [])

  const trendingMedia = animeMedia(trending.data).slice(0, 10)
  const heroMedia = animeMedia(trending.data).slice(0, 5)

  // Browse when a name is typed or a genre picked. A typed query takes
  // precedence over the genre filter (AniList search can't also filter).
  const buildRequest = (p) =>
    queryTrim ? searchAnime(queryTrim, p) : getAnimeGenre(genre, p)

  const browse = useFetch(
    () => (browsing ? buildRequest(1) : Promise.resolve(null)),
    [queryTrim, genre],
  )

  // Replace the visible set whenever a fresh first-page result arrives.
  useEffect(() => {
    if (!browse.data) return
    setItems(animeMedia(browse.data))
    setPage(1)
    setHasMore(Boolean(browse.data?.Page?.pageInfo?.hasNextPage))
  }, [browse.data])

  // Append the next page to the existing grid.
  const loadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    try {
      const d = await buildRequest(next)
      setItems((prev) => [...prev, ...animeMedia(d)])
      setPage(next)
      setHasMore(Boolean(d?.Page?.pageInfo?.hasNextPage))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="series-page">
      <AnimeTopbar
        query={query}
        onQuery={setQuery}
        genre={genre}
        onGenre={setGenre}
        genreList={genreList}
      />

      {browsing ? (
        <>
          {browse.loading && <div className="spinner" />}
          {browse.error && (
            <div className="error-box">Failed to load anime: {browse.error.message}</div>
          )}
          {!browse.loading && !browse.error && items.length === 0 && (
            <div className="search-empty">
              {queryTrim
                ? `No anime found for "${queryTrim}".`
                : 'No anime in this genre yet.'}
            </div>
          )}
          {items.length > 0 && (
            <>
              <div className="series-grid">
                {items.map((item) => (
                  <AnimeCard key={item.id} item={item} />
                ))}
              </div>
              <div className="series-load">
                <button
                  className="btn btn-ghost"
                  onClick={loadMore}
                  disabled={loadingMore || !hasMore}
                >
                  {loadingMore ? 'Loading…' : hasMore ? 'Load More' : 'No more anime'}
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {trending.loading ? (
            <div className="spinner" />
          ) : (
            <>
              <AnimeHeroBanner items={heroMedia} />
              <AnimeRow title="Top Rated Anime" items={animeMedia(topRated.data)} />
              <AnimeRow title="Top Rated Anime Movies" items={animeMedia(movies.data)} />
              <AnimeRow title="Trending Top 10" items={trendingMedia} />
              <AnimeRow title="Latest Anime" items={animeMedia(latest.data)} />
            </>
          )}
        </>
      )}
    </div>
  )
}