function itemKey(item) {
  const id = item.id && String(item.id).trim()
  if (id) return id
  if (item.link) return item.link
  return null
}

export function serializeFeedForStorage(feed) {
  if (!feed) return null
  return {
    title: feed.title,
    description: feed.description,
    lastBuildDate: feed.lastBuildDate instanceof Date
      ? feed.lastBuildDate.toISOString()
      : feed.lastBuildDate,
    items: (feed.items || []).map((item) => ({
      ...item,
      pubDate: item.pubDate instanceof Date ? item.pubDate.toISOString() : item.pubDate,
    })),
  }
}

export function reviveFeedFromStorage(stored) {
  if (!stored) return null
  return {
    ...stored,
    lastBuildDate: stored.lastBuildDate ? new Date(stored.lastBuildDate) : null,
    items: (stored.items || []).map((item) => ({
      ...item,
      pubDate: new Date(item.pubDate),
    })),
  }
}

/**
 * Union archived + live by stable id; live wins on collision.
 * Items only in the archive (aged off the RSS) are kept.
 */
export function mergeFeedSnapshots(archivedFeed, liveFeed) {
  const map = new Map()

  if (archivedFeed?.items?.length) {
    for (const item of archivedFeed.items) {
      const key = itemKey(item)
      if (!key) continue
      map.set(key, {
        ...item,
        pubDate: item.pubDate instanceof Date ? item.pubDate : new Date(item.pubDate),
      })
    }
  }

  if (liveFeed?.items?.length) {
    for (const item of liveFeed.items) {
      const key = itemKey(item)
      if (!key) continue
      map.set(key, { ...item })
    }
  }

  const items = Array.from(map.values()).sort((a, b) => b.pubDate - a.pubDate)

  return {
    title: liveFeed?.title || archivedFeed?.title || 'Mountain Project Feed',
    description: liveFeed?.description ?? archivedFeed?.description ?? '',
    lastBuildDate: liveFeed?.lastBuildDate ?? archivedFeed?.lastBuildDate ?? null,
    items,
  }
}
