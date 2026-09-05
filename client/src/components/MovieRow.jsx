import MovieCard from './MovieCard'
import Skeleton from './Skeleton'

export default function MovieRow({ title, items, loading = false }) {
  if (!loading && (!items || items.length === 0)) return null

  return (
    <section className="shelf">
      <h2>{title}</h2>
      <div className="row">
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