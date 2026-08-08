import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Search from './pages/Search'
import MovieDetail from './pages/MovieDetail'
import TvDetail from './pages/TvDetail'
import PlayerPage from './pages/PlayerPage'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
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