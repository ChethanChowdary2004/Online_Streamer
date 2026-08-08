import MovieCard from './MovieCard'

// A horizontal, scrollable shelf of cards.
export default function MovieRow({ title, items }) {
  if (!items || items.length === 0) return null

  return (
    <section className="shelf">
      <h2>{title}</h2>
      <div className="row">
        {items.map((item) => (
          <MovieCard key={item.id} item={item} type={item.media_type} />
        ))}
      </div>
    </section>
  )
}