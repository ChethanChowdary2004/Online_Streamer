import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Topbar from './components/Topbar'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Movies from './pages/Movies'
import Series from './pages/Series'
import AnimePage from './pages/AnimePage'
import AnimeDetail from './pages/AnimeDetail'
import Search from './pages/Search'
import MovieDetail from './pages/MovieDetail'
import TvDetail from './pages/TvDetail'
import PlayerPage from './pages/PlayerPage'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // The anime page's search + genre filter live in the top bar, so their state
  // is owned here and shared by the Topbar (inputs) and AnimePage (browsing).
  const [animeQuery, setAnimeQuery] = useState('')
  const [animeGenre, setAnimeGenre] = useState('')

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <>
      <Topbar
        onToggleSidebar={toggleSidebar}
        animeQuery={animeQuery}
        onAnimeQuery={setAnimeQuery}
        animeGenre={animeGenre}
        onAnimeGenre={setAnimeGenre}
      />
      <Navbar isOpen={sidebarOpen} onClose={closeSidebar} />
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
          <Route path="/watch/:type/:id" element={<PlayerPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </>
  )
}