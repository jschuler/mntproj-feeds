import './Header.css'

function Header({ title, lastBuildDate, onRefresh, loading, itemCount, dateRange }) {
  const formatDate = (date) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  const formatShortDate = (date) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  return (
    <header className="header">
      <div className="header-bg">
        <div className="mountain-shape mountain-1"></div>
        <div className="mountain-shape mountain-2"></div>
        <div className="mountain-shape mountain-3"></div>
        <div className="sun-glow"></div>
      </div>
      
      <div className="header-content">
        <div className="header-top">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4L28 28H4L16 4Z" fill="currentColor" opacity="0.9"/>
              <path d="M16 10L22 24H10L16 10Z" fill="var(--bg-primary)" opacity="0.4"/>
              <circle cx="24" cy="8" r="3" fill="var(--accent-warm)"/>
            </svg>
          </div>
          
          <button 
            className={`refresh-btn ${loading ? 'loading' : ''}`}
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh feed"
          >
            <svg className="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
        
        <div className="header-main">
          <span className="header-badge">Breaks Interstate Park</span>
          <h1 className="header-title">Latest Updates</h1>
          <p className="header-subtitle">
            New routes, photos & beta from the climbing community
          </p>
        </div>
        
        <div className="header-meta">
          {itemCount > 0 && (
            <span className="meta-item">
              <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              {itemCount} items
            </span>
          )}
          {dateRange && (
            <span className="meta-item">
              <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatShortDate(dateRange.oldest)} – {formatShortDate(dateRange.newest)}
            </span>
          )}
          {lastBuildDate && (
            <span className="meta-item meta-updated">
              Updated {formatDate(lastBuildDate)}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

