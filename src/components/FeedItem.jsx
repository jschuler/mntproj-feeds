import { useRef, useState, useEffect } from 'react'
import './FeedItem.css'

const TYPE_CONFIG = {
  comment: {
    icon: '💬',
    label: 'Comment',
    color: 'var(--accent-primary)',
  },
  photo: {
    icon: '📸',
    label: 'Photo',
    color: 'var(--accent-warm)',
  },
  route: {
    icon: '🧗',
    label: 'New Route',
    color: '#60a5fa',
  },
  area: {
    icon: '🗺️',
    label: 'New Area',
    color: '#c084fc',
  },
  update: {
    icon: '📝',
    label: 'Update',
    color: 'var(--text-muted)',
  },
}

function FeedItem({ item, index, expanded, onToggle }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.update
  
  const formatDate = (date) => {
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 60) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else if (days < 7) {
      return `${days}d ago`
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date)
    }
  }

  // Extract clean text from HTML description
  const getCleanDescription = () => {
    const temp = document.createElement('div')
    temp.innerHTML = item.description
    
    // The description format is: "Comment text<br>Location breadcrumbs...<br>Shared By: ..."
    // We only want the actual comment/description text, not the navigation
    
    // Get the first text node or content before the first link (which starts the breadcrumb)
    const firstLink = temp.querySelector('a')
    if (firstLink) {
      // Get all text content before the first link
      let text = ''
      const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false)
      let node
      while ((node = walker.nextNode())) {
        // Stop if we've reached content after/inside a link
        if (firstLink.contains(node) || firstLink.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
          break
        }
        text += node.textContent
      }
      return text.replace(/Shared By:.*$/i, '').trim()
    }
    
    // Fallback: remove all links, images, and clean up
    temp.querySelectorAll('img, a').forEach(el => el.remove())
    return temp.textContent
      .replace(/Shared By:.*$/i, '')
      .replace(/\s*>\s*/g, ' ') // Remove breadcrumb arrows
      .replace(/\s+/g, ' ')     // Collapse whitespace
      .trim()
  }

  const cleanDesc = getCleanDescription()
  
  // Extract YouTube video IDs from description
  const getYouTubeVideos = () => {
    const videos = []
    // Match various YouTube URL formats
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?][^\s<]*)?/g
    let match
    while ((match = youtubeRegex.exec(item.description)) !== null) {
      if (!videos.includes(match[1])) {
        videos.push(match[1])
      }
    }
    return videos
  }
  
  const youtubeVideos = getYouTubeVideos()
  
  // Use ref to detect if text is actually truncated (only check when not expanded)
  const descRef = useRef(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const checkedRef = useRef(false)
  
  useEffect(() => {
    // Only check once after initial render when collapsed
    if (!checkedRef.current && !expanded) {
      const el = descRef.current
      if (el) {
        // Small delay to ensure CSS is applied
        requestAnimationFrame(() => {
          setIsTruncated(el.scrollHeight > el.clientHeight + 1)
          checkedRef.current = true
        })
      }
    }
  }, [cleanDesc, expanded])

  return (
    <article 
      className={`feed-item ${expanded ? 'expanded' : ''}`}
      style={{ 
        '--index': index,
        '--type-color': config.color,
      }}
    >
      <div className="feed-item-header">
        <div className="feed-item-type">
          <span className="type-icon">{config.icon}</span>
          <span className="type-label">{config.label}</span>
        </div>
        
        <div className="feed-item-meta">
          <time className="feed-item-date">{formatDate(item.pubDate)}</time>
        </div>
      </div>
      
      {/* Location Context */}
      {item.targetRoute && (
        <div className="feed-item-location" onClick={(e) => e.stopPropagation()}>
          {item.locationPath && item.locationPath.length > 0 && (
            <div className="location-breadcrumb">
              <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {item.locationPath.map((loc, i) => (
                <span key={loc.url} className="breadcrumb-item">
                  {i > 0 && <span className="breadcrumb-sep">›</span>}
                  <a href={loc.url} target="_blank" rel="noopener noreferrer">
                    {loc.name}
                  </a>
                </span>
              ))}
            </div>
          )}
          
          <div className="target-item">
            <span className="target-type route">
              🧗
            </span>
            <a 
              href={item.targetRoute.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="target-link"
            >
              {item.targetRoute.name}
            </a>
            {item.grade && (
              <span className="target-grade">{item.grade}</span>
            )}
          </div>
        </div>
      )}
      
      <div className="feed-item-content">
        <h3 className="feed-item-title">{item.cleanTitle || item.title}</h3>
        
        {item.type === 'photo' && item.imageUrl && (
          <div className="feed-item-image">
            <img 
              src={item.imageUrl} 
              alt={item.cleanTitle}
              loading="lazy"
            />
          </div>
        )}
        
        {cleanDesc && (
          <div className="feed-item-description-wrapper">
            <p 
              ref={descRef}
              className={`feed-item-description ${expanded ? 'expanded' : ''}`}
            >
              {cleanDesc}
            </p>
            {isTruncated && (
              <button className="expand-btn" onClick={onToggle}>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
        
        {/* YouTube Embeds */}
        {youtubeVideos.length > 0 && (
          <div className="youtube-embeds">
            {youtubeVideos.map((videoId) => (
              <div key={videoId} className="youtube-embed">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="feed-item-footer">
        {item.sharedBy && (
          <span className="shared-by">
            <svg className="user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {item.sharedBy}
          </span>
        )}
        
        <a 
          href={item.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="view-link"
          onClick={(e) => e.stopPropagation()}
        >
          View on MP
          <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    </article>
  )
}

export default FeedItem

