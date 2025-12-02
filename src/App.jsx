import { useState, useEffect } from 'react'
import './App.css'
import FeedItem from './components/FeedItem'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import LoadingState from './components/LoadingState'
import ErrorState from './components/ErrorState'

// In production (Vercel), uses /api/rss serverless function
// In development, Vite proxies /api/rss to Mountain Project
const RSS_URL = '/api/rss?selectedIds=111742350&routes=on&areas=on&comments=on&photos=on'

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
    
    // Clean title
    let cleanTitle = titleText
    if (titleText.includes(':')) {
      cleanTitle = titleText.split(':').slice(1).join(':').trim()
    }
    
    // Extract shared by
    const sharedByMatch = description.match(/Shared By: ([^<]+)/)
    const sharedBy = sharedByMatch ? sharedByMatch[1].trim() : null
    
    // Extract location breadcrumbs from description
    const breadcrumbs = []
    const linkRegex = /<a href="(https:\/\/www\.mountainproject\.com\/(area|route)\/[^"]+)">([^<]+)<\/a>/g
    let match
    while ((match = linkRegex.exec(description)) !== null) {
      const [, url, linkType, name] = match
      // Clean up the name (remove grade if present, decode entities)
      let cleanName = name.replace(/&amp;/g, '&').replace(/&hellip;/g, '…').trim()
      
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
      
      // Extract grade from route name if present
      const routeGradeMatch = cleanName.match(/^(.+?)\s*\(([^)]+)\)$/)
      if (routeGradeMatch) {
        cleanName = routeGradeMatch[1].trim()
      }
      breadcrumbs.push({
        name: cleanName,
        url,
        type: linkType, // 'area' or 'route'
      })
    }
    
    // Find the target route/area (usually the last item in breadcrumbs)
    const targetItem = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null
    
    // Get the parent areas (everything except Virginia and SW Virginia and the target)
    // Skip first 2 (Virginia, Southwest Virginia) and get intermediate areas
    const locationPath = breadcrumbs.slice(2, -1)
    
    return {
      id: guid,
      title: titleText,
      cleanTitle,
      link,
      pubDate: new Date(pubDate),
      description,
      type,
      imageUrl,
      grade,
      sharedBy,
      breadcrumbs,
      targetItem,
      locationPath,
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
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expandedItems, setExpandedItems] = useState(new Set())

  const fetchFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(RSS_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`)
      }
      const xmlText = await response.text()
      const parsedFeed = parseRSSFeed(xmlText)
      setFeed(parsedFeed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed()
  }, [])

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

  const filteredItems = feed?.items.filter((item) => {
    if (filter === 'all') return true
    return item.type === filter
  }) || []

  const typeCounts = feed?.items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {}) || {}

  // Calculate date range from items
  const dateRange = feed?.items.length > 0 ? {
    oldest: new Date(Math.min(...feed.items.map(i => i.pubDate))),
    newest: new Date(Math.max(...feed.items.map(i => i.pubDate))),
  } : null

  return (
    <div className="app">
      <Header 
        title={feed?.title || 'Mountain Project Feed'}
        lastBuildDate={feed?.lastBuildDate}
        onRefresh={fetchFeed}
        loading={loading}
        itemCount={feed?.items.length || 0}
        dateRange={dateRange}
      />
      
      <main className="main-content">
        {loading && !feed ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchFeed} />
        ) : (
          <>
            <FilterBar 
              filter={filter} 
              setFilter={setFilter} 
              counts={typeCounts}
              total={feed?.items.length || 0}
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
          <a href="https://www.mountainproject.com/area/111742350/breaks-interstate-park" target="_blank" rel="noopener noreferrer">Breaks Interstate Park</a>
        </p>
      </footer>
    </div>
  )
}

export default App

