#!/usr/bin/env node
/**
 * Fetches each area's Mountain Project RSS, merges with the on-disk JSON under
 * public/data/feeds/<slug>.json, and writes the result back.
 * Run: npm run sync-feeds
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { AREAS, mtnProjRssUrlForArea } from '../src/areas.js'
import { parseMtnProjRssXml } from '../src/parseMtnProjRss.js'
import { mergeFeedSnapshots, serializeFeedForStorage, reviveFeedFromStorage } from '../src/mergeFeedSnapshots.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const feedsDir = join(root, 'public', 'data', 'feeds')

function createNodeDocument(xmlString) {
  return new JSDOM(xmlString, { contentType: 'text/xml' }).window.document
}

async function readExisting(path) {
  try {
    const raw = await readFile(path, 'utf8')
    return reviveFeedFromStorage(JSON.parse(raw))
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return null
    }
    throw e
  }
}

async function syncOne(area) {
  const filePath = join(feedsDir, `${area.slug}.json`)
  const onDisk = await readExisting(filePath)
  const url = mtnProjRssUrlForArea(area.id)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'mntproj-feeds-sync/1.0' },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${area.name} (${url})`)
  }
  const xml = await res.text()
  const live = parseMtnProjRssXml(xml, createNodeDocument)
  const merged = mergeFeedSnapshots(onDisk, live)
  const json = JSON.stringify(serializeFeedForStorage(merged), null, 2) + '\n'
  await writeFile(filePath, json, 'utf8')
  console.log(`${area.slug}: ${merged.items.length} items (was ${onDisk?.items?.length ?? 0} on disk + live ${live.items.length})`)
}

async function main() {
  await mkdir(feedsDir, { recursive: true })
  for (const area of AREAS) {
    await syncOne(area)
  }
  console.log('Done. Commit public/data/feeds/*.json to ship with the app.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
