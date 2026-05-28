import he from 'he'

const decodeHtmlEntities = he.decode

/**
 * @param {string} xmlString
 * @param {(s: string) => Document} createDocument — DOMParser in the browser, JSDOM in Node
 */
export function parseMtnProjRssXml(xmlString, createDocument) {
  const doc = createDocument(xmlString)
  const channel = doc.querySelector('channel')
  const title = channel?.querySelector('title')?.textContent || 'Mountain Project Feed'
  const description = channel?.querySelector('description')?.textContent || ''
  const lastBuildDate = channel?.querySelector('lastBuildDate')?.textContent || ''

  const items = Array.from(doc.querySelectorAll('item')).map((item) => {
    const titleText = item.querySelector('title')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    const guid = item.querySelector('guid')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''
    const itemDescription = item.querySelector('description')?.textContent || ''

    let itemType = 'update'
    if (titleText.toLowerCase().startsWith('comment')) {
      itemType = 'comment'
    } else if (titleText.toLowerCase().startsWith('photo')) {
      itemType = 'photo'
    } else if (link.includes('/route/')) {
      itemType = 'route'
    } else if (link.includes('/area/')) {
      itemType = 'area'
    }

    const imgMatch = itemDescription.match(/src='([^']+)'/)
    let imageUrl = imgMatch ? imgMatch[1] : null

    if (imageUrl) {
      imageUrl = imageUrl.replace('_smallMed_', '_large_')
    }

    const gradeMatch = titleText.match(/\(([^)]+)\)/)
    const grade = gradeMatch ? gradeMatch[1] : null

    let cleanTitle = titleText

    if (itemType === 'comment' && titleText.toLowerCase().startsWith('comment re:')) {
      const firstColonIndex = titleText.indexOf(':')
      const secondColonIndex = titleText.indexOf(':', firstColonIndex + 1)
      if (secondColonIndex !== -1) {
        cleanTitle = titleText.substring(secondColonIndex + 1).trim()
      }
    } else if (itemType === 'photo' && titleText.toLowerCase().startsWith('photo:')) {
      cleanTitle = titleText.substring(6).trim()
    } else if (titleText.includes(':')) {
      cleanTitle = titleText.split(':').slice(1).join(':').trim()
    }

    cleanTitle = cleanTitle.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim()
    cleanTitle = decodeHtmlEntities(cleanTitle)

    const sharedByMatch = itemDescription.match(/Shared By: ([^<]+)/)
    const sharedBy = sharedByMatch ? sharedByMatch[1].trim() : null

    const breadcrumbs = []
    const linkRegex = /<a href="(https:\/\/www\.mountainproject\.com\/(area|route)\/[^"]+)">([^<]+)<\/a>/g
    let match
    while ((match = linkRegex.exec(itemDescription)) !== null) {
      const [, url, linkType, name] = match
      let cleanName = decodeHtmlEntities(name)?.trim() || name.trim()

      if (cleanName.includes('…')) {
        const urlSlug = url.split('/').pop()
        if (urlSlug) {
          cleanName = urlSlug
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
      }

      let itemGrade = null
      const routeGradeMatch = cleanName.match(/^(.+?)\s*\(([^)]+)\)$/)
      if (routeGradeMatch) {
        cleanName = routeGradeMatch[1].trim()
        itemGrade = routeGradeMatch[2]
      }
      breadcrumbs.push({
        name: cleanName,
        url,
        type: linkType,
        grade: itemGrade,
      })
    }

    const targetRoute = [...breadcrumbs].reverse().find((b) => b.type === 'route') || null
    const routeIndex = targetRoute ? breadcrumbs.indexOf(targetRoute) : breadcrumbs.length
    const locationPath = breadcrumbs.slice(2, routeIndex)

    const mainAreaBreadcrumb = breadcrumbs[2]
    let areaId = null
    let areaName = null
    if (mainAreaBreadcrumb) {
      const areaIdMatch = mainAreaBreadcrumb.url.match(/\/area\/(\d+)\//)
      areaId = areaIdMatch ? areaIdMatch[1] : null
      areaName = mainAreaBreadcrumb.name
    }

    const routeGrade = targetRoute?.grade || grade

    return {
      id: guid,
      title: titleText,
      cleanTitle,
      link,
      pubDate: new Date(pubDate),
      description: itemDescription,
      type: itemType,
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

export function createBrowserDocument(xmlString) {
  return new DOMParser().parseFromString(xmlString, 'text/xml')
}
