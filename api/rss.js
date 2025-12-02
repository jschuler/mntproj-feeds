// Vercel Serverless Function - proxies RSS feed to avoid CORS
export default async function handler(req, res) {
  const { selectedIds = '111742350', routes = 'on', areas = 'on', comments = 'on', photos = 'on' } = req.query

  const url = `https://www.mountainproject.com/rss/new?selectedIds=${selectedIds}&routes=${routes}&areas=${areas}&comments=${comments}&photos=${photos}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MountainProjectFeedViewer/1.0',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch RSS feed' })
    }

    const xml = await response.text()
    
    res.setHeader('Content-Type', 'application/rss+xml')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate') // Cache for 5 min
    res.status(200).send(xml)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

