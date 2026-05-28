/** @typedef {{ id: string, name: string, shortName: string, slug: string }} MtnArea */

/** @type {MtnArea[]} */
export const AREAS = [
  { id: '105841134', name: 'Red River Gorge', shortName: 'RRG', slug: 'rrg' },
  { id: '111742350', name: 'Breaks Interstate Park', shortName: 'Breaks', slug: 'breaks' },
  // { id: '108649375', name: 'Guest River Gorge', shortName: 'Guest River', slug: 'guest' },
  // { id: '106477419', name: 'Grayson Highlands State Park', shortName: 'Grayson', slug: 'grayson' },
  // { id: '114141698', name: "Ben's Branch", shortName: "Ben's Branch", slug: 'bens-branch' },
  // { id: '108293709', name: 'High Knob', shortName: 'High Knob', slug: 'high-knob' },
]

/**
 * @param {string} [slug]
 * @returns {MtnArea}
 */
export function getAreaBySlug(slug) {
  return AREAS.find((a) => a.slug === slug) || AREAS[0]
}

const RSS_ON = 'routes=on&areas=on&comments=on&photos=on'

/**
 * Mountain Project RSS (same query as the app and Vite proxy in dev).
 * @param {string} areaId
 */
export function mtnProjRssUrlForArea(areaId) {
  return `https://www.mountainproject.com/rss/new?selectedIds=${areaId}&${RSS_ON}`
}

/** Public URL path (Vite: file lives under public/data/feeds/Slug.json) */
export function feedDataPathForSlug(slug) {
  return `/data/feeds/${slug}.json`
}
