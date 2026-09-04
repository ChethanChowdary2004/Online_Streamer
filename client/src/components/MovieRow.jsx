import { useRef } from 'react'
import MovieCard from './MovieCard'
import Skeleton from './Skeleton'

export default function MovieRow({ title, items, loading = false }) {
  const rowRef = useRef(null)

  const scrollRow = (direction) => {
    if (rowRef.current) {
      const cardWidth = 180
      const scrollAmount = cardWidth * direction
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!loading && (!items || items.length === 0)) return null

  return (
    <section className="shelf">
      <div className="shelf-header">
        <h2>
          <span className="accent-bar" />
          {title}
        </h2>
        <div className="shelf-controls">
          <button onClick={() => scrollRow(-1)} className="scroll-arrow" aria-label="Scroll left">&lsaquo;</button>
          <button onClick={() => scrollRow(1)} className="scroll-arrow" aria-label="Scroll right">&rsaquo;</button>
        </div>
      </div>
      <div className="row" ref={rowRef}>
        {loading ? (
          <Skeleton variant="card" count={6} />
        ) : (
          items.map((item) => (
            <MovieCard key={item.id} item={item} type={item.media_type} />
          ))
        )}
      </div>
    </section>
  )
}