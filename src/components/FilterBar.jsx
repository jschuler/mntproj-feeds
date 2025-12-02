import './FilterBar.css'

const FILTERS = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'comment', label: 'Comments', icon: '💬' },
  { id: 'photo', label: 'Photos', icon: '📸' },
  { id: 'route', label: 'Routes', icon: '🧗' },
  { id: 'area', label: 'Areas', icon: '🗺️' },
]

function FilterBar({ filter, setFilter, counts, total }) {
  return (
    <div className="filter-bar">
      <div className="filter-buttons">
        {FILTERS.map(({ id, label, icon }) => {
          const count = id === 'all' ? total : (counts[id] || 0)
          const isEmpty = id !== 'all' && count === 0
          
          return (
            <button
              key={id}
              className={`filter-btn ${filter === id ? 'active' : ''} ${isEmpty ? 'empty' : ''}`}
              onClick={() => !isEmpty && setFilter(id)}
              disabled={isEmpty}
              title={isEmpty ? `No ${label.toLowerCase()} in current feed` : `Show ${label.toLowerCase()}`}
            >
              <span className="filter-icon">{icon}</span>
              <span className="filter-label">{label}</span>
              <span className="filter-count">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default FilterBar

