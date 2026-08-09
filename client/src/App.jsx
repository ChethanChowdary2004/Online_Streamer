import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Topbar from './components/Topbar'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Series from './pages/Series'
import Search from './pages/Search'
import MovieDetail from './pages/MovieDetail'
import TvDetail from './pages/TvDetail'
import PlayerPage from './pages/PlayerPage'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <>
      <Topbar onToggleSidebar={toggleSidebar} />
      <Navbar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series" element={<Series />} />
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