import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './App.css'
import FeedItem from './components/FeedItem'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import Pagination from './components/Pagination'
import LoadingState from './components/LoadingState'
import ErrorState from './components/ErrorState'

const PAGE_SIZE = 25
import { AREAS, getAreaBySlug, feedDataPathForSlug } from './areas'
import { parseMtnProjRssXml, createBrowserDocument } from './parseMtnProjRss'
import { mergeFeedSnapshots, reviveFeedFromStorage } from './mergeFeedSnapshots'

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
  const [page, setPage] = useState(1)
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

  useEffect(() => {
    fetchFeed(selectedArea)
  }, [selectedArea])

  useEffect(() => {
    setPage(1)
  }, [selectedArea, filter])

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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pagedItems = filteredItems.slice(pageStart, pageStart + PAGE_SIZE)

  const handlePageChange = (next) => {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
                <>
                  <Pagination
                    placement="top"
                    page={safePage}
                    totalPages={totalPages}
                    totalItems={filteredItems.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                  />
                  <div className="feed-list">
                    {pagedItems.map((item, index) => (
                      <FeedItem
                        key={item.id}
                        item={item}
                        index={pageStart + index}
                        expanded={expandedItems.has(item.id)}
                        onToggle={() => toggleExpanded(item.id)}
                      />
                    ))}
                  </div>
                  <Pagination
                    placement="bottom"
                    page={safePage}
                    totalPages={totalPages}
                    totalItems={filteredItems.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                  />
                </>
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
