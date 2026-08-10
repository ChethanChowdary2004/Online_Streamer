import FilterSelect from './FilterSelect'

// Anime page top bar: page title + a search input and a genre filter,
// styled like the Series page toolbar (FilterSelect dropdown).
export default function AnimeTopbar({ query, onQuery, genre, onGenre, genreList }) {
  return (
    <>
      <h1 className="series-title">Anime</h1>

      <div className="series-toolbar">
        <input
          className="series-search-input"
          type="search"
          placeholder="Search anime…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search anime"
        />

        <div className="series-filters-row">
          <FilterSelect
            label="Genre"
            value={genre}
            onChange={onGenre}
            options={[
              { value: '', label: 'All Genres' },
              ...(genreList || []).map((g) => ({ value: g, label: g })),
            ]}
          />
        </div>
      </div>
    </>
  )
}