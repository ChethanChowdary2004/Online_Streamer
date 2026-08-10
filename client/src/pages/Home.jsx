import { useMemo } from 'react'
import {
  getTrending,
  getMovieList,
  getTvList,
  discoverMovies,
} from '../api'
import useFetch from '../hooks/useFetch'
import HeroBanner from '../components/HeroBanner'
import MovieRow from '../components/MovieRow'

export default function Home() {
  const trending = useFetch(() => getTrending())
  const popularMovies = useFetch(() => getMovieList('popular'))
  const popularSeries = useFetch(() => getTvList('popular'))
  const topRatedMovies = useFetch(() => getMovieList('top_rated'))
  const actionAdventure = useFetch(() => discoverMovies({ with_genres: '28,12' }))
  const comedy = useFetch(() => discoverMovies({ with_genres: '35' }))
  const sciFiFantasy = useFetch(() => discoverMovies({ with_genres: '878,14' }))
  const topRatedSeries = useFetch(() => getTvList('top_rated'))

  // Hero = top five trending movies for the auto-sliding banner.
  const heroItems = useMemo(
    () =>
      (trending.data?.results || [])
        .filter((m) => !m.adult)
        .slice(0, 5)
        .map((m) => ({ ...m, media_type: 'movie' })),
    [trending.data],
  )

  // Show the spinner until the hero is ready; rows appear as they load.
  if (trending.loading) return <div className="spinner" />

  const rows = [
    { title: 'Popular Movies', list: popularMovies, type: 'movie' },
    { title: 'Popular Series', list: popularSeries, type: 'tv' },
    { title: 'Top Rated Movies', list: topRatedMovies, type: 'movie' },
    { title: 'Action & Adventure', list: actionAdventure, type: 'movie' },
    { title: 'Comedy', list: comedy, type: 'movie' },
    { title: 'Sci-Fi & Fantasy', list: sciFiFantasy, type: 'movie' },
    { title: 'Top Rated Series', list: topRatedSeries, type: 'tv' },
  ]

  return (
    <>
      <HeroBanner items={heroItems} />
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
