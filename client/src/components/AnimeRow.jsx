import AnimeCard from './AnimeCard'

// A horizontal, scrollable shelf of anime cards.
export default function AnimeRow({ title, items }) {
  if (!items || items.length === 0) return null

  return (
    <section className="shelf">
      <h2>{title}</h2>
      <div className="row">
        {items.map((item) => (
          <AnimeCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}