import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './App.css'
import FeedItem from './components/FeedItem'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import LoadingState from './components/LoadingState'
import ErrorState from './components/ErrorState'

// Area definitions with URL slugs
const AREAS = [
  { id: '105841134', name: 'Red River Gorge', shortName: 'RRG', slug: 'rrg' },
  { id: '111742350', name: 'Breaks Interstate Park', shortName: 'Breaks', slug: 'breaks' },
  { id: '108649375', name: 'Guest River Gorge', shortName: 'Guest River', slug: 'guest' },
  { id: '106477419', name: 'Grayson Highlands State Park', shortName: 'Grayson', slug: 'grayson' },
]

// Helper to find area by slug
const getAreaBySlug = (slug) => AREAS.find(a => a.slug === slug) || AREAS[0]

// Build RSS URL for a specific area
const getRssUrl = (areaId) => 
  `/api/rss?selectedIds=${areaId}&routes=on&areas=on&comments=on&photos=on`

// Decode HTML entities like &#039; &amp; &quot; etc.
const decodeHtmlEntities = (text) => {
  if (!text) return text
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

function parseRSSFeed(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  
  const channel = doc.querySelector('channel')
  const title = channel?.querySelector('title')?.textContent || 'Mountain Project Feed'
  const description = channel?.querySelector('description')?.textContent || ''
  const lastBuildDate = channel?.querySelector('lastBuildDate')?.textContent || ''
  
  const items = Array.from(doc.querySelectorAll('item')).map((item) => {
    const titleText = item.querySelector('title')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    const guid = item.querySelector('guid')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''
    const description = item.querySelector('description')?.textContent || ''
    
    // Determine item type from title/content
    let type = 'update'
    if (titleText.toLowerCase().startsWith('comment')) {
      type = 'comment'
    } else if (titleText.toLowerCase().startsWith('photo')) {
      type = 'photo'
    } else if (link.includes('/route/')) {
      type = 'route'
    } else if (link.includes('/area/')) {
      type = 'area'
    }
    
    // Extract image from description if present
    const imgMatch = description.match(/src='([^']+)'/)
    let imageUrl = imgMatch ? imgMatch[1] : null
    
    // Upgrade image to larger resolution (replace _smallMed_ with _large_)
    if (imageUrl) {
      imageUrl = imageUrl.replace('_smallMed_', '_large_')
    }
    
    // Extract route/area name and grade
    const gradeMatch = titleText.match(/\(([^)]+)\)/)
    const grade = gradeMatch ? gradeMatch[1] : null
    
    // Clean title - remove prefix and route name for comments/photos
    let cleanTitle = titleText
    
    // For "Comment re: Route Name: actual text..." or "Photo: description..."
    // We want just the actual text, since route name is shown in the location section
    if (type === 'comment' && titleText.toLowerCase().startsWith('comment re:')) {
      // Pattern: "Comment re: Route Name: actual comment..."
      // Find the second colon and take everything after it
      const firstColonIndex = titleText.indexOf(':')
      const secondColonIndex = titleText.indexOf(':', firstColonIndex + 1)
      if (secondColonIndex !== -1) {
        cleanTitle = titleText.substring(secondColonIndex + 1).trim()
      }
    } else if (type === 'photo' && titleText.toLowerCase().startsWith('photo:')) {
      // Pattern: "Photo: description..."
      cleanTitle = titleText.substring(6).trim() // Remove "Photo:"
    } else if (titleText.includes(':')) {
      cleanTitle = titleText.split(':').slice(1).join(':').trim()
    }
    
    // Strip HTML tags like <br /> from title and decode HTML entities
    cleanTitle = cleanTitle.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim()
    cleanTitle = decodeHtmlEntities(cleanTitle)
    
    // Extract shared by
    const sharedByMatch = description.match(/Shared By: ([^<]+)/)
    const sharedBy = sharedByMatch ? sharedByMatch[1].trim() : null
    
    // Extract location breadcrumbs from description
    const breadcrumbs = []
    const linkRegex = /<a href="(https:\/\/www\.mountainproject\.com\/(area|route)\/[^"]+)">([^<]+)<\/a>/g
    let match
    while ((match = linkRegex.exec(description)) !== null) {
      const [, url, linkType, name] = match
      // Clean up the name (decode HTML entities)
      let cleanName = decodeHtmlEntities(name)?.trim() || name.trim()
      
      // If name is truncated (contains …), extract full name from URL slug
      if (cleanName.includes('…')) {
        const urlSlug = url.split('/').pop() // e.g., "desert-pony-buttress"
        if (urlSlug) {
          // Convert slug to title case: "desert-pony-buttress" → "Desert Pony Buttress"
          cleanName = urlSlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
      }
      
      // Extract grade from route name if present (e.g., "Tan & Handsome (5.10b)")
      let itemGrade = null
      const routeGradeMatch = cleanName.match(/^(.+?)\s*\(([^)]+)\)$/)
      if (routeGradeMatch) {
        cleanName = routeGradeMatch[1].trim()
        itemGrade = routeGradeMatch[2] // e.g., "5.10b"
      }
      breadcrumbs.push({
        name: cleanName,
        url,
        type: linkType, // 'area' or 'route'
        grade: itemGrade,
      })
    }
    
    // Find the target route (look for the last item with type 'route')
    const targetRoute = [...breadcrumbs].reverse().find(b => b.type === 'route') || null
    
    // Find the index of the target route (or end of array if no route)
    const routeIndex = targetRoute ? breadcrumbs.indexOf(targetRoute) : breadcrumbs.length
    
    // Get the parent areas: skip first 2 (Virginia, Southwest Virginia), 
    // include everything up to (but not including) the route
    const locationPath = breadcrumbs.slice(2, routeIndex)
    
    // Extract the main area (index 2 is typically RRG/Breaks/Guest River after VA > SW VA)
    const mainAreaBreadcrumb = breadcrumbs[2]
    let areaId = null
    let areaName = null
    if (mainAreaBreadcrumb) {
      // Extract area ID from URL like ".../area/111742350/breaks-interstate-park"
      const areaIdMatch = mainAreaBreadcrumb.url.match(/\/area\/(\d+)\//)
      areaId = areaIdMatch ? areaIdMatch[1] : null
      areaName = mainAreaBreadcrumb.name
    }
    
    // Use grade from target route if available, otherwise fall back to title extraction
    const routeGrade = targetRoute?.grade || grade
    
    return {
      id: guid,
      title: titleText,
      cleanTitle,
      link,
      pubDate: new Date(pubDate),
      description,
      type,
      imageUrl,
      grade: routeGrade,
      sharedBy,
      breadcrumbs,
      targetRoute,
      locationPath,
      areaId,
      areaName,
    }
  })
  
  return {
    title,
    description,
    lastBuildDate: lastBuildDate ? new Date(lastBuildDate) : null,
    items,
  }
}

function App() {
  const { areaSlug } = useParams()
  const navigate = useNavigate()
  
  const [feedCache, setFeedCache] = useState({}) // Cache feeds per area
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expandedItems, setExpandedItems] = useState(new Set())
  
  // Get current area from URL slug (defaults to first area)
  const currentArea = getAreaBySlug(areaSlug)
  const selectedArea = currentArea.id
  
  // Navigate to new area
  const setSelectedArea = (areaId) => {
    const area = AREAS.find(a => a.id === areaId)
    if (area) {
      navigate(`/${area.slug}`)
    }
  }

  const fetchFeed = async (areaId, forceRefresh = false) => {
    // Use cached feed if available and not forcing refresh
    if (!forceRefresh && feedCache[areaId]) {
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(getRssUrl(areaId))
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`)
      }
      const xmlText = await response.text()
      const parsedFeed = parseRSSFeed(xmlText)
      setFeedCache(prev => ({ ...prev, [areaId]: parsedFeed }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch when area changes
  useEffect(() => {
    fetchFeed(selectedArea)
  }, [selectedArea])
  
  // Current feed based on selected area
  const feed = feedCache[selectedArea]

  const toggleExpanded = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  const handleRefresh = () => {
    fetchFeed(selectedArea, true) // Force refresh
  }

  // Filter by type
  const feedItems = feed?.items || []

  const filteredItems = feedItems.filter((item) => {
    if (filter === 'all') return true
    return item.type === filter
  })

  // Count types
  const typeCounts = feedItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {})

  // Calculate date range
  const dateRange = feedItems.length > 0 ? {
    oldest: new Date(Math.min(...feedItems.map(i => i.pubDate))),
    newest: new Date(Math.max(...feedItems.map(i => i.pubDate))),
  } : null
  
  // Get selected area info
  const selectedAreaInfo = AREAS.find(a => a.id === selectedArea)

  return (
    <div className="app">
      <Header 
        title={feed?.title || 'Mountain Project Feed'}
        lastBuildDate={feed?.lastBuildDate}
        onRefresh={handleRefresh}
        loading={loading}
        itemCount={feedItems.length}
        dateRange={dateRange}
        areas={AREAS}
        selectedArea={selectedArea}
        setSelectedArea={setSelectedArea}
        selectedAreaName={selectedAreaInfo?.name}
      />
      
      <main className="main-content">
        {loading && !feed ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : (
          <>
            <FilterBar 
              filter={filter} 
              setFilter={setFilter} 
              counts={typeCounts}
              total={feedItems.length}
            />
            
            <div className="feed-container">
              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏔️</div>
                  <p>No items match the current filter</p>
                </div>
              ) : (
                <div className="feed-list">
                  {filteredItems.map((item, index) => (
                    <FeedItem
                      key={item.id}
                      item={item}
                      index={index}
                      expanded={expandedItems.has(item.id)}
                      onToggle={() => toggleExpanded(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      
      <footer className="footer">
        <p>
          Data from <a href="https://www.mountainproject.com" target="_blank" rel="noopener noreferrer">Mountain Project</a>
          <span className="separator">•</span>
          <a href={`https://www.mountainproject.com/area/${selectedAreaInfo?.id}`} target="_blank" rel="noopener noreferrer">{selectedAreaInfo?.name}</a>
        </p>
      </footer>
    </div>
  )
}

export default App

