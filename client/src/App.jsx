import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
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
import Login from './pages/Login'
import Signup from './pages/Signup'
import Logout from './pages/Logout'
import Favorites from './pages/Favorites'
import History from './pages/History'

export default function App() {
  const [animeQuery, setAnimeQuery] = useState('')
  const [animeGenre, setAnimeGenre] = useState('')

  return (
    <AuthProvider>
      <FavoritesProvider>
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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </FavoritesProvider>
    </AuthProvider>
  )
}