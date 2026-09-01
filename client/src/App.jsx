import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Topbar from './components/Topbar'
import Home from './pages/Home'
import Movies from './pages/Movies'
import Series from './pages/Series'
import AnimePage from './pages/AnimePage'
import AnimeDetail from './pages/AnimeDetail'
import Search from './pages/Search'
import MovieDetail from './pages/MovieDetail'
import TvDetail from './pages/TvDetail'
import MoviePlayerPage from './pages/MoviePlayerPage'
import SeriesPlayerPage from './pages/SeriesPlayerPage'
import AnimePlayerPage from './pages/AnimePlayerPage'
import PlayerRouter from './pages/PlayerRouter'

export default function App() {
  const [animeQuery, setAnimeQuery] = useState('')
  const [animeGenre, setAnimeGenre] = useState('')

  return (
    <>
      <Topbar
        animeQuery={animeQuery}
        onAnimeQuery={setAnimeQuery}
        animeGenre={animeGenre}
        onAnimeGenre={setAnimeGenre}
      />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/series" element={<Series />} />
          <Route
            path="/anime"
            element={<AnimePage query={animeQuery} genre={animeGenre} />}
          />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/tv/:id" element={<TvDetail />} />
          <Route path="/watch/:type/:id" element={<PlayerRouter />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </>
  )
}