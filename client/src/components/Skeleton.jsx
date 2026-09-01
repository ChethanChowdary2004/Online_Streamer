export default function Skeleton({ variant = 'card', count = 1, width = '100%', height = '20px' }) {
  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </>
    )
  }

  if (variant === 'text') {
    return <div className="skeleton skeleton-text" style={{ width, height }} />
  }

  if (variant === 'hero') {
    return <div className="skeleton skeleton-hero" />
  }

  if (variant === 'block') {
    return <div className="skeleton skeleton-block" style={{ width, height }} />
  }

  return null
}
