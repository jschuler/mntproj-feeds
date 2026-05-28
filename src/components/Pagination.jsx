import './Pagination.css'

function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, placement = 'bottom' }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const goTo = (next) => {
    onPageChange(Math.min(Math.max(1, next), totalPages))
  }

  return (
    <nav className={`pagination pagination--${placement}`} aria-label="Feed pagination">
      <p className="pagination-summary">
        Showing <span className="pagination-range">{start}–{end}</span> of {totalItems}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          ← Prev
        </button>
        <span className="pagination-status" aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="pagination-btn"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </nav>
  )
}

export default Pagination
