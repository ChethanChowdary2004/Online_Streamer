import { useMemo } from 'react'
import { getMovieList, getTvList } from '../api'
import useFetch from '../hooks/useFetch'
import HeroBanner from '../components/HeroBanner'
import MovieRow from '../components/MovieRow'

export default function Home() {
  const now = useFetch(() => getMovieList('now_playing'))
  const popular = useFetch(() => getMovieList('popular'))
  const topRated = useFetch(() => getMovieList('top_rated'))
  const tvPopular = useFetch(() => getTvList('popular'))
  const tvTopRated = useFetch(() => getTvList('top_rated'))

  // Hero = first non-adult movie currently playing.
  const hero = useMemo(() => {
    const results = now.data?.results || []
    const pick = results.find((m) => !m.adult) || results[0]
    return pick ? { ...pick, media_type: 'movie' } : null
  }, [now.data])

  const loading =
    now.loading && popular.loading && topRated.loading && tvPopular.loading && tvTopRated.loading

  if (loading) return <div className="spinner" />

  const rows = [
    { title: 'Now Playing', list: now, type: 'movie' },
    { title: 'Popular Movies', list: popular, type: 'movie' },
    { title: 'Top Rated Movies', list: topRated, type: 'movie' },
    { title: 'Popular TV Series', list: tvPopular, type: 'tv' },
    { title: 'Top Rated TV', list: tvTopRated, type: 'tv' },
  ]

  return (
    <>
      <HeroBanner item={hero} />
      {rows.map((row) => (
        <MovieRow
          key={row.title}
          title={row.title}
          items={(row.list.data?.results || []).map((item) => ({
            ...item,
            media_type: row.type,
          }))}
        />
      ))}
    </>
  )
}