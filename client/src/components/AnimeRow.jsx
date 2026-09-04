import { useRef } from 'react'
import AnimeCard from './AnimeCard'

// A horizontal, scrollable shelf of anime cards.
export default function AnimeRow({ title, items }) {
  const rowRef = useRef(null)

  const scrollRow = (direction) => {
    if (rowRef.current) {
      const cardWidth = 180
      const scrollAmount = cardWidth * direction
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!items || items.length === 0) return null

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
        {items.map((item) => (
          <AnimeCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}