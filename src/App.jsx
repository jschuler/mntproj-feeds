import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './App.css'
import FeedItem from './components/FeedItem'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import LoadingState from './components/LoadingState'
import ErrorState from './components/ErrorState'
import { AREAS, getAreaBySlug, feedDataPathForSlug } from './areas'
import { parseMtnProjRssXml, createBrowserDocument } from './parseMtnProjRss'
import { mergeFeedSnapshots, serializeFeedForStorage, reviveFeedFromStorage } from './mergeFeedSnapshots'

// Build RSS URL for a specific area
const getRssUrl = (areaId) =>
  `/api/rss?selectedIds=${areaId}&routes=on&areas=on&comments=on&photos=on`

function App() {
  const { areaSlug } = useParams()
  const navigate = useNavigate()

  const [feedCache, setFeedCache] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expandedItems, setExpandedItems] = useState(new Set())

  const currentArea = getAreaBySlug(areaSlug)
  const selectedArea = currentArea.id

  const setSelectedArea = (areaId) => {
    const area = AREAS.find((a) => a.id === areaId)
    if (area) {
      navigate(`/${area.slug}`)
    }
  }

  const fetchFeed = async (areaId) => {
    const area = AREAS.find((a) => a.id === areaId) || currentArea
    const fileUrl = feedDataPathForSlug(area.slug)
    setLoading(true)
    setError(null)

    let fileFeed = null
    try {
      const fileRes = await fetch(fileUrl, { cache: 'no-store' })
      if (fileRes.ok) {
        const json = await fileRes.json()
        fileFeed = reviveFeedFromStorage(json)
        if (fileFeed?.items?.length) {
          setFeedCache((prev) => ({ ...prev, [areaId]: fileFeed }))
        }
      }
    } catch {
      // Missing or invalid JSON is fine — live RSS only
    }

    try {
      const response = await fetch(getRssUrl(areaId))
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`)
      }
      const xmlText = await response.text()
      const live = parseMtnProjRssXml(xmlText, createBrowserDocument)
      const merged = mergeFeedSnapshots(fileFeed, live)
      setFeedCache((prev) => ({ ...prev, [areaId]: merged }))
    } catch (err) {
      setError(err.message)
      if (fileFeed?.items?.length) {
        setFeedCache((prev) => ({ ...prev, [areaId]: fileFeed }))
      }
    } finally {
      setLoading(false)
    }
  }

  const exportArchiveJson = () => {
    const feed = feedCache[selectedArea]
    if (!feed?.items?.length) return
    const payload = serializeFeedForStorage(feed)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mntproj-feed-${currentArea.slug}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    fetchFeed(selectedArea)
  }, [selectedArea])

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
    fetchFeed(selectedArea)
  }

  const feedItems = feed?.items || []

  const filteredItems = feedItems.filter((item) => {
    if (filter === 'all') return true
    return item.type === filter
  })

  const typeCounts = feedItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {})

  const dateRange = feedItems.length > 0 ? {
    oldest: new Date(Math.min(...feedItems.map((i) => i.pubDate))),
    newest: new Date(Math.max(...feedItems.map((i) => i.pubDate))),
  } : null

  const selectedAreaInfo = AREAS.find((a) => a.id === selectedArea)

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
        <p className="footer-archive-hint">
          The app loads <code>data/feeds/&lt;area&gt;.json</code> (from <code>npm run sync-feeds</code>) and merges the live RSS on each visit so you see new items without losing older ones that fell off the feed.
        </p>
        <div className="footer-archive-actions">
          <button
            type="button"
            className="footer-link-btn"
            onClick={exportArchiveJson}
            disabled={!feedItems.length}
            aria-label="Download merged view as JSON"
          >
            Export JSON
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
