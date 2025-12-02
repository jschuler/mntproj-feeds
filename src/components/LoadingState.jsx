import './LoadingState.css'

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-content">
        <div className="loading-mountain">
          <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              className="mountain-path mountain-back" 
              d="M0 80L40 20L80 80H0Z" 
              fill="currentColor"
            />
            <path 
              className="mountain-path mountain-front" 
              d="M30 80L70 25L110 80H30Z" 
              fill="currentColor"
            />
            <circle className="loading-sun" cx="95" cy="18" r="10" fill="var(--accent-warm)"/>
          </svg>
        </div>
        
        <p className="loading-text">Loading feed...</p>
        
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <div className="skeleton-items">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-item" style={{ '--delay': `${i * 0.1}s` }}>
            <div className="skeleton-header">
              <div className="skeleton-badge"></div>
              <div className="skeleton-date"></div>
            </div>
            <div className="skeleton-title"></div>
            <div className="skeleton-desc"></div>
            <div className="skeleton-footer">
              <div className="skeleton-user"></div>
              <div className="skeleton-link"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LoadingState

