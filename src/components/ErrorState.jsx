import './ErrorState.css'

function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-icon">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
          <path 
            d="M40 25V45" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          <circle cx="40" cy="55" r="3" fill="currentColor"/>
        </svg>
      </div>
      
      <h3 className="error-title">Unable to load feed</h3>
      <p className="error-message">{message}</p>
      
      <button className="retry-btn" onClick={onRetry}>
        <svg className="retry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Try again
      </button>
      
      <p className="error-hint">
        If the problem persists, check your internet connection or try again later.
      </p>
    </div>
  )
}

export default ErrorState

